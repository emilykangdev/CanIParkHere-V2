"""
Parking Service - Core Business Logic
Handles parking analysis, search, and location checking
"""

import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
import structlog

from models.requests import ParkingSearchRequest, LocationCheckRequest, FollowUpRequest
from models.responses import (
    ParkingCheckResponse, ParkingSearchResponse, LocationCheckResponse,
    FollowUpResponse, ParkingSignResult, PublicParkingResult
)
from models.internal import SessionData, ImageAnalysisResult
from services.openai_service import OpenAIService
from services.aws_service import AWSService
from geo.spatial_query_api import get_signs_nearby, public_parking_nearby

log = structlog.get_logger()


class ParkingService:
    """Core parking analysis and search service"""
    
    def __init__(self, openai_service: Optional[OpenAIService] = None, aws_service: Optional[AWSService] = None):
        """Initialize parking service with dependencies"""
        self.openai_service = openai_service
        self.aws_service = aws_service
        self.sessions: Dict[str, SessionData] = {}  # In-memory session storage
        
        # Parking sign mappings (from original main.py)
        self.parking_signs = {
            "Paid Parking": ["PR", "PPP", "PPL", "PPEAK"],
            "Time Limited Parking": ["PTIML", "PTRKL"],
            "Parking Zone": ["PZONE", "PRZ", "PBZ"],
            "General Parking Sign": ["PS"],
            "General Business Parking": ["GBP"]
        }
        
        # Reverse mapping for quick lookup
        self.code_to_desc = {code: desc for desc, codes in self.parking_signs.items() for code in codes}
        
        log.info("Parking service initialized")
    
    async def analyze_parking_image(self, image_bytes: bytes, datetime_str: Optional[str] = None) -> ParkingCheckResponse:
        """
        Analyze parking sign from image
        
        Args:
            image_bytes: Raw image data
            datetime_str: Optional datetime context
            
        Returns:
            ParkingCheckResponse with analysis results
        """
        session_id = str(uuid.uuid4())
        
        if not self.openai_service:
            return self._create_error_response(session_id, "Image analysis service not available")
        
        try:
            # Analyze image with OpenAI
            analysis_result = await self.openai_service.analyze_parking_sign(image_bytes, datetime_str)
            
            if not analysis_result.success:
                return self._create_error_response(session_id, analysis_result.error or "Analysis failed")
            
            # Store session data for follow-up questions
            session_data = SessionData(
                session_id=session_id,
                original_request={"type": "image_analysis", "datetime": datetime_str},
                analysis_result=analysis_result.dict()
            )
            self.sessions[session_id] = session_data
            
            # Create response based on analysis
            return ParkingCheckResponse(
                messageType="parking",
                session_id=session_id,
                isParkingSignFound="true" if analysis_result.sign_detected else "false",
                canPark=self._determine_parking_permission(analysis_result),
                reason=self._generate_parking_reason(analysis_result),
                rules=analysis_result.text_extracted,
                parsedText=analysis_result.text_extracted,
                advice=self._generate_parking_advice(analysis_result),
                processing_method="image_api"
            )
            
        except Exception as e:
            log.error(f"Image analysis failed: {e}")
            return self._create_error_response(session_id, str(e))
    
    async def search_parking(self, request: ParkingSearchRequest) -> ParkingSearchResponse:
        """
        Search for parking signs and facilities near a location
        
        Args:
            request: Search request with location and radius
            
        Returns:
            ParkingSearchResponse with nearby parking options
        """
        session_id = str(uuid.uuid4())
        
        try:
            # Search for parking signs
            sign_results = []
            parking_results = []

            if self.aws_service and self.aws_service.athena_client:
                sign_results = get_signs_nearby(
                    lat=request.latitude,
                    lon=request.longitude,
                    athena_client=self.aws_service.athena_client,
                    log=log,
                    radius_meters=request.radius_meters or 100,
                    debug=False,
                    top_n=20
                )

                # Search for public parking
                parking_results = public_parking_nearby(
                    lat=request.latitude,
                    lon=request.longitude,
                    athena_client=self.aws_service.athena_client,
                    log=log,
                    radius_meters=request.radius_meters or 100,
                    debug=False,
                    top_n=20
                )
            else:
                log.warning("AWS service not available, returning empty results")
            
            # Convert to response format
            parking_signs = [
                ParkingSignResult(
                    id=str(sign.get('id', uuid.uuid4())),
                    lat=sign['lat'],
                    lng=sign['lng'],
                    category=sign.get('category', 'Unknown'),
                    description=sign.get('description'),
                    rules=sign.get('rules'),
                    distance_m=sign.get('distance_m')
                )
                for sign in sign_results
            ]
            
            public_parking = [
                PublicParkingResult(
                    id=str(facility.get('id', uuid.uuid4())),
                    name=facility.get('name', 'Unknown Facility'),
                    lat=facility['lat'],
                    lng=facility['lng'],
                    address=facility.get('address'),
                    capacity=facility.get('capacity'),
                    available_spots=facility.get('available_spots'),
                    hourly_rate=facility.get('hourly_rate'),
                    distance_m=facility.get('distance_m'),
                    facility_type=facility.get('facility_type')
                )
                for facility in parking_results
            ]
            
            return ParkingSearchResponse(
                session_id=session_id,
                parking_sign_results=parking_signs,
                public_parking_results=public_parking,
                processing_method="search_api"
            )
            
        except Exception as e:
            log.error(f"Parking search failed: {e}")
            return ParkingSearchResponse(
                session_id=session_id,
                parking_sign_results=[],
                public_parking_results=[],
                processing_method="search_api_error"
            )
    
    async def check_location(self, request: LocationCheckRequest) -> LocationCheckResponse:
        """
        Check parking rules at a specific location
        
        Args:
            request: Location check request
            
        Returns:
            LocationCheckResponse with parking status
        """
        try:
            # This is a simplified implementation
            # In a real system, this would query a comprehensive parking rules database
            
            # For now, search for nearby signs and make a determination
            nearby_signs = []
            if self.aws_service and self.aws_service.athena_client:
                nearby_signs = get_signs_nearby(
                    lat=request.latitude,
                    lon=request.longitude,
                    athena_client=self.aws_service.athena_client,
                    log=log,
                    radius_meters=50,
                    debug=False,
                    top_n=10
                )
            
            if not nearby_signs:
                return LocationCheckResponse(
                    canPark=True,
                    message="No parking restrictions found in this area. Standard parking rules may apply.",
                    processing_method="location_api"
                )
            
            # Analyze the closest sign
            closest_sign = min(nearby_signs, key=lambda x: x.get('distance_m', float('inf')))
            
            # Simple rule interpretation (this would be more sophisticated in production)
            can_park = "No Parking" not in closest_sign.get('description', '')
            
            return LocationCheckResponse(
                canPark=can_park,
                message=f"Based on nearby parking sign: {closest_sign.get('description', 'Unknown rules')}",
                processing_method="location_api"
            )
            
        except Exception as e:
            log.error(f"Location check failed: {e}")
            return LocationCheckResponse(
                canPark=False,
                message=f"Unable to determine parking rules: {str(e)}",
                processing_method="location_api_error"
            )
    
    async def answer_followup(self, request: FollowUpRequest) -> FollowUpResponse:
        """
        Answer follow-up questions about previous parking analysis
        
        Args:
            request: Follow-up question request
            
        Returns:
            FollowUpResponse with answer
        """
        if not self.openai_service:
            return FollowUpResponse(answer="Follow-up service not available")
        
        # Get session data
        session_data = self.sessions.get(request.session_id)
        if not session_data:
            return FollowUpResponse(answer="Session not found. Please start a new parking analysis.")
        
        try:
            answer = await self.openai_service.answer_followup_question(
                request.question, 
                session_data.analysis_result
            )
            return FollowUpResponse(answer=answer)
            
        except Exception as e:
            log.error(f"Follow-up question failed: {e}")
            return FollowUpResponse(answer=f"Sorry, I couldn't answer your question: {str(e)}")
    
    def _determine_parking_permission(self, analysis: ImageAnalysisResult) -> str:
        """Determine parking permission from analysis"""
        if not analysis.sign_detected:
            return "uncertain"
        
        text = analysis.text_extracted.lower()
        if "no parking" in text or "no stopping" in text:
            return "false"
        elif "parking" in text:
            return "true"
        else:
            return "uncertain"
    
    def _generate_parking_reason(self, analysis: ImageAnalysisResult) -> str:
        """Generate human-readable reason for parking decision"""
        if not analysis.sign_detected:
            return "No clear parking sign detected in the image"
        
        permission = self._determine_parking_permission(analysis)
        if permission == "false":
            return "Parking is not allowed based on the sign restrictions"
        elif permission == "true":
            return "Parking appears to be allowed based on the sign"
        else:
            return "Parking rules are unclear from the sign"
    
    def _generate_parking_advice(self, analysis: ImageAnalysisResult) -> str:
        """Generate helpful advice for the user"""
        if not analysis.sign_detected:
            return "Try taking a clearer photo of the parking sign, or check for other signs in the area."
        
        return "Always verify current time restrictions and payment requirements before parking."
    
    def _create_error_response(self, session_id: str, error_message: str) -> ParkingCheckResponse:
        """Create error response for parking check"""
        return ParkingCheckResponse(
            messageType="error",
            session_id=session_id,
            isParkingSignFound="false",
            canPark="uncertain",
            reason=f"Analysis failed: {error_message}",
            rules="",
            parsedText="",
            advice="Please try again with a clearer image.",
            processing_method="error"
        )

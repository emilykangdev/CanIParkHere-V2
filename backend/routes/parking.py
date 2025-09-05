"""
Parking Routes - Main API Endpoints
Clean route definitions with proper dependency injection
"""

from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from typing import Optional
import structlog

from models.requests import ParkingSearchRequest, LocationCheckRequest, FollowUpRequest
from models.responses import ParkingCheckResponse, ParkingSearchResponse, LocationCheckResponse, FollowUpResponse
from services.parking_service import ParkingService
from core.dependencies import get_parking_service
from core.exceptions import ParkingAnalysisError, InvalidImageError, ServiceUnavailableError

log = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["parking"])


@router.post("/check-parking-image", response_model=ParkingCheckResponse)
async def check_parking_image(
    file: UploadFile = File(...),
    datetime_str: Optional[str] = Form(None),
    parking_service: ParkingService = Depends(get_parking_service)
):
    """
    Analyze parking sign from uploaded image
    
    - **file**: Image file containing parking sign
    - **datetime_str**: Optional current datetime for context
    
    Returns detailed parking analysis including rules and recommendations.
    """
    log.info(f"Received image upload: {file.filename}, size: {file.size}")
    
    # Validate file
    if not file.content_type or not file.content_type.startswith('image/'):
        raise InvalidImageError("File must be an image")
    
    if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
        raise InvalidImageError("Image file too large (max 10MB)")
    
    try:
        # Read image data
        image_bytes = await file.read()
        
        if not image_bytes:
            raise InvalidImageError("Empty image file")
        
        # Analyze image
        result = await parking_service.analyze_parking_image(image_bytes, datetime_str)
        
        log.info(f"Image analysis completed: {result.session_id}")
        return result
        
    except Exception as e:
        log.error(f"Image analysis failed: {e}")
        raise ParkingAnalysisError(f"Failed to analyze image: {str(e)}")


@router.post("/search-parking", response_model=ParkingSearchResponse)
async def search_parking(
    request: ParkingSearchRequest,
    parking_service: ParkingService = Depends(get_parking_service)
):
    """
    Search for parking signs and facilities near a location
    
    - **latitude**: Latitude coordinate (-90 to 90)
    - **longitude**: Longitude coordinate (-180 to 180)
    - **radius_meters**: Search radius in meters (10-5000, default 100)
    
    Returns nearby parking signs and public parking facilities.
    """
    log.info(f"Parking search request: {request.latitude}, {request.longitude}")
    
    try:
        result = await parking_service.search_parking(request)
        
        log.info(f"Search completed: {len(result.parking_sign_results)} signs, {len(result.public_parking_results)} facilities")
        return result
        
    except Exception as e:
        log.error(f"Parking search failed: {e}")
        raise ParkingAnalysisError(f"Failed to search parking: {str(e)}")


@router.post("/check-parking-location", response_model=LocationCheckResponse)
async def check_parking_location(
    request: LocationCheckRequest,
    parking_service: ParkingService = Depends(get_parking_service)
):
    """
    Check parking rules at a specific location
    
    - **latitude**: Latitude coordinate (-90 to 90)
    - **longitude**: Longitude coordinate (-180 to 180)
    - **datetime**: Optional ISO datetime string for time-based rules
    
    Returns parking permission status and applicable rules.
    """
    log.info(f"Location check request: {request.latitude}, {request.longitude}")
    
    try:
        result = await parking_service.check_location(request)
        
        log.info(f"Location check completed: can_park={result.canPark}")
        return result
        
    except Exception as e:
        log.error(f"Location check failed: {e}")
        raise ParkingAnalysisError(f"Failed to check location: {str(e)}")


@router.post("/followup", response_model=FollowUpResponse)
async def followup_question(
    request: FollowUpRequest,
    parking_service: ParkingService = Depends(get_parking_service)
):
    """
    Ask follow-up questions about a previous parking analysis
    
    - **session_id**: Session ID from previous parking check
    - **question**: Your follow-up question (max 500 characters)
    
    Returns an answer based on the previous analysis context.
    """
    log.info(f"Follow-up question for session: {request.session_id}")
    
    try:
        result = await parking_service.answer_followup(request)
        
        log.info(f"Follow-up completed for session: {request.session_id}")
        return result
        
    except Exception as e:
        log.error(f"Follow-up failed: {e}")
        raise ParkingAnalysisError(f"Failed to answer follow-up: {str(e)}")

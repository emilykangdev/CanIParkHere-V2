"""
Response Models with Enhanced Structure
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from enum import Enum


class ParkingCategory(str, Enum):
    """Parking categories for sign classification"""
    UNRESTRICTED = "Unrestricted Parking"
    NO_PARKING = "No Parking Allowed"  
    RESTRICTED_ZONE = "Restricted Parking Zone"
    PAID_PARKING = "Paid Parking"
    TIME_LIMITED = "Time Limited Parking"
    CARPOOL = "Carpool Parking"


class ParkingSignResult(BaseModel):
    """Individual parking sign result"""
    id: str = Field(..., description="Unique identifier for the sign")
    lat: float = Field(..., description="Latitude of the sign")
    lng: float = Field(..., description="Longitude of the sign")
    category: str = Field(..., description="Parking category")
    description: Optional[str] = Field(None, description="Human-readable description")
    rules: Optional[str] = Field(None, description="Parking rules text")
    distance_m: Optional[float] = Field(None, description="Distance from search point in meters")


class PublicParkingResult(BaseModel):
    """Individual public parking facility result"""
    id: str = Field(..., description="Unique identifier for the facility")
    name: str = Field(..., description="Name of the parking facility")
    lat: float = Field(..., description="Latitude of the facility")
    lng: float = Field(..., description="Longitude of the facility")
    address: Optional[str] = Field(None, description="Street address")
    capacity: Optional[int] = Field(None, description="Total parking capacity")
    available_spots: Optional[int] = Field(None, description="Currently available spots")
    hourly_rate: Optional[float] = Field(None, description="Hourly parking rate")
    distance_m: Optional[float] = Field(None, description="Distance from search point in meters")
    facility_type: Optional[str] = Field(None, description="Type of facility (garage, lot, street)")


class ParkingCheckResponse(BaseModel):
    """Response from parking sign analysis"""
    messageType: str = Field(..., description="Type of message for frontend routing")
    session_id: str = Field(..., description="Session ID for follow-up questions")
    isParkingSignFound: Literal["true", "false"] = Field(..., description="Whether a parking sign was detected")
    canPark: Literal["true", "false", "uncertain"] = Field(..., description="Parking permission status")
    reason: str = Field(..., description="Clear explanation of the parking decision")
    rules: str = Field(..., description="Full text of parking rules found")
    parsedText: str = Field(..., description="Raw text extracted from the image")
    advice: str = Field(..., description="Additional helpful advice")
    processing_method: str = Field(..., description="Method used to process the request")


class ParkingSearchResponse(BaseModel):
    """Response from parking search"""
    session_id: str = Field(..., description="Session ID for follow-up questions")
    parking_sign_results: List[ParkingSignResult] = Field(..., description="List of parking signs found")
    public_parking_results: List[PublicParkingResult] = Field(..., description="List of public parking facilities found")
    processing_method: str = Field(default="search_api", description="Processing method identifier")


class LocationCheckResponse(BaseModel):
    """Response from location-based parking check"""
    canPark: bool = Field(..., description="Whether parking is allowed at this location")
    message: str = Field(..., description="Descriptive message about parking rules")
    processing_method: str = Field(default="location_api", description="Processing method identifier")


class FollowUpResponse(BaseModel):
    """Response to follow-up questions"""
    answer: str = Field(..., description="Answer to the follow-up question")


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: Literal["healthy", "unhealthy"] = Field(..., description="Overall health status")
    services: Optional[Dict[str, str]] = Field(None, description="Status of individual services")
    timestamp: str = Field(..., description="Timestamp of health check")
    error: Optional[str] = Field(None, description="Error message if unhealthy")


class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str = Field(..., description="Error message")
    status_code: Optional[int] = Field(None, description="HTTP status code")
    error_type: Optional[str] = Field(None, description="Type of error")
    timestamp: Optional[str] = Field(None, description="Error timestamp")

"""
Clean Pydantic models for CanIParkHere API
Optimized for OpenAPI generation and frontend consumption
"""

from enum import Enum
from pydantic import BaseModel, Field
from typing import Literal


class ParkingCategory(str, Enum):
    """Parking categories for sign classification"""
    UNRESTRICTED = "Unrestricted Parking"
    NO_PARKING = "No Parking Allowed"  
    RESTRICTED_ZONE = "Restricted Parking Zone"
    PAID_PARKING = "Paid Parking"
    TIME_LIMITED = "Time Limited Parking"
    CARPOOL = "Carpool Parking"


# Core API Response Models
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
    parking_sign_results: list = Field(..., description="List of parking results found")
    public_parking_results: list = Field(..., description="List of public parking facilities found")
    processing_method: str = Field(default="search_api", description="Processing method identifier")

# TODO: Fix this.... 
class LocationCheckResponse(BaseModel):
    """Response from location-based parking check"""
    canPark: bool = Field(..., description="Whether parking is allowed at this location")
    message: str = Field(..., description="Descriptive message about parking rules")
    processing_method: str = Field(default="location_api", description="Processing method identifier")


class FollowUpRequest(BaseModel):
    """Request for follow-up questions about a parking check"""
    session_id: str = Field(..., description="Session ID from previous parking check")
    question: str = Field(..., description="User's follow-up question")


class FollowUpResponse(BaseModel):
    """Response to follow-up question"""
    answer: str = Field(..., description="Answer to the user's question")


# Request Models
class ParkingSearchRequest(BaseModel):
    """Request for location-based parking check"""
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate") 
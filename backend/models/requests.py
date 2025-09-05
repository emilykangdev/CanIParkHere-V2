"""
Request Models with Enhanced Validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class ParkingSearchRequest(BaseModel):
    """Request for parking search by location"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    radius_meters: Optional[int] = Field(100, ge=10, le=5000, description="Search radius in meters")
    
    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @validator('longitude')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v


class LocationCheckRequest(BaseModel):
    """Request for location-based parking check"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    datetime: Optional[str] = Field(None, description="ISO datetime string for time-based rules")
    
    @validator('datetime')
    def validate_datetime(cls, v):
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid datetime format. Use ISO format.')
        return v


class FollowUpRequest(BaseModel):
    """Request for follow-up questions about a parking check"""
    session_id: str = Field(..., min_length=1, description="Session ID from previous parking check")
    question: str = Field(..., min_length=1, max_length=500, description="Follow-up question")
    
    @validator('question')
    def validate_question(cls, v):
        if not v.strip():
            raise ValueError('Question cannot be empty')
        return v.strip()


class ImageUploadRequest(BaseModel):
    """Request for image-based parking analysis"""
    datetime_str: Optional[str] = Field(None, description="Current datetime for context")
    
    @validator('datetime_str')
    def validate_datetime_str(cls, v):
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid datetime format. Use ISO format.')
        return v

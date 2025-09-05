"""
Internal Data Models for Business Logic
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class ParkingSignData(BaseModel):
    """Internal representation of parking sign data"""
    code: str = Field(..., description="Internal parking sign code")
    description: str = Field(..., description="Human-readable description")
    category: str = Field(..., description="Parking category")
    rules: Optional[str] = Field(None, description="Detailed parking rules")
    time_restrictions: Optional[List[str]] = Field(None, description="Time-based restrictions")
    payment_required: Optional[bool] = Field(None, description="Whether payment is required")


class ImageAnalysisResult(BaseModel):
    """Result from image analysis"""
    success: bool = Field(..., description="Whether analysis was successful")
    text_extracted: str = Field(..., description="Raw text extracted from image")
    confidence: Optional[float] = Field(None, description="Confidence score")
    sign_detected: bool = Field(..., description="Whether a parking sign was detected")
    analysis_method: str = Field(..., description="Method used for analysis")
    error: Optional[str] = Field(None, description="Error message if analysis failed")


class SessionData(BaseModel):
    """Session data for follow-up questions"""
    session_id: str = Field(..., description="Unique session identifier")
    original_request: Dict[str, Any] = Field(..., description="Original request data")
    analysis_result: Dict[str, Any] = Field(..., description="Analysis result data")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation time")
    expires_at: Optional[datetime] = Field(None, description="Session expiration time")


class ServiceStatus(BaseModel):
    """Status of external services"""
    openai: bool = Field(False, description="OpenAI service availability")
    aws_s3: bool = Field(False, description="AWS S3 service availability")
    aws_athena: bool = Field(False, description="AWS Athena service availability")
    firebase: bool = Field(False, description="Firebase service availability")
    
    @property
    def all_healthy(self) -> bool:
        """Check if all critical services are healthy"""
        return self.openai  # Only OpenAI is critical for core functionality
    
    @property
    def status_summary(self) -> Dict[str, str]:
        """Get status summary for health check"""
        return {
            "gpt4o": "healthy" if self.openai else "unavailable",
            "llm": "healthy" if self.openai else "unavailable", 
            "parser": "healthy" if self.openai else "unavailable",
            "s3": "healthy" if self.aws_s3 else "unavailable"
        }

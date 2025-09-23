"""
Application Configuration using Pydantic Settings
Centralizes all environment variables and configuration
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional, List
import os


class Settings(BaseSettings):
    """Application settings with environment variable validation"""
    
    # API Configuration
    title: str = "CanIParkHere API"
    version: str = "2.0.0"
    debug: bool = Field(False, env="DEBUG")
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001", 
            "https://caniparkhere.dev",
            "https://caniparkhere.vercel.app",
        ],
        env="CORS_ORIGINS"
    )
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    
    # AWS Configuration
    aws_access_key_id: Optional[str] = Field(None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(None, env="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field("us-west-2", env="AWS_REGION")
    s3_bucket: Optional[str] = Field(None, env="S3_BUCKET")
    
    # Firebase Configuration
    firebase_service_account: Optional[str] = Field(None, env="FIREBASE_SERVICE_ACCOUNT")
    
    # Frontend Configuration
    next_development_url: Optional[str] = Field(None, env="NEXT_DEVELOPMENT_URL")
    
    # Parking Configuration
    parking_limit_default: int = Field(10, env="PARKING_LIMIT_DEFAULT")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables
        
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins including dynamic ones"""
        origins = self.cors_origins.copy()
        if self.next_development_url:
            origins.append(self.next_development_url)
        return [origin for origin in origins if origin]  # Filter out None values
    
    @property
    def has_openai_config(self) -> bool:
        """Check if OpenAI is configured"""
        return bool(self.openai_api_key)
    
    @property
    def has_aws_config(self) -> bool:
        """Check if AWS is configured"""
        return bool(self.aws_access_key_id and self.aws_secret_access_key)
    
    @property
    def has_firebase_config(self) -> bool:
        """Check if Firebase is configured"""
        return bool(self.firebase_service_account)


# Global settings instance
settings = Settings()

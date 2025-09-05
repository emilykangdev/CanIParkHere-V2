"""
Dependency Injection for FastAPI
Clean service initialization and dependency management
"""

from functools import lru_cache
from typing import Optional
import structlog

from services.openai_service import create_openai_service, OpenAIService
from services.aws_service import create_aws_service, AWSService
from services.firebase_service import create_firebase_service, FirebaseService
from services.parking_service import ParkingService
from models.internal import ServiceStatus
from config.settings import settings

log = structlog.get_logger()


class ServiceContainer:
    """Container for all application services"""
    
    def __init__(self):
        self._openai_service: Optional[OpenAIService] = None
        self._aws_service: Optional[AWSService] = None
        self._firebase_service: Optional[FirebaseService] = None
        self._parking_service: Optional[ParkingService] = None
        self._initialized = False
    
    def initialize(self):
        """Initialize all services"""
        if self._initialized:
            return
        
        log.info("Initializing services...")
        
        # Initialize OpenAI service
        self._openai_service = create_openai_service()
        
        # Initialize AWS service
        self._aws_service = create_aws_service()

        # Initialize Firebase service
        self._firebase_service = create_firebase_service()

        # Initialize parking service with dependencies
        self._parking_service = ParkingService(
            openai_service=self._openai_service,
            aws_service=self._aws_service
        )
        
        self._initialized = True
        log.info("Services initialized successfully")
    
    @property
    def openai_service(self) -> Optional[OpenAIService]:
        """Get OpenAI service"""
        return self._openai_service
    
    @property
    def aws_service(self) -> Optional[AWSService]:
        """Get AWS service"""
        return self._aws_service

    @property
    def firebase_service(self) -> Optional[FirebaseService]:
        """Get Firebase service"""
        return self._firebase_service
    
    @property
    def parking_service(self) -> ParkingService:
        """Get parking service (always available)"""
        if not self._parking_service:
            raise RuntimeError("Services not initialized")
        return self._parking_service
    
    def get_service_status(self) -> ServiceStatus:
        """Get status of all services"""
        status = ServiceStatus()
        
        # Check OpenAI
        if self._openai_service:
            try:
                status.openai = self._openai_service.health_check()
            except Exception:
                status.openai = False
        
        # Check AWS
        if self._aws_service:
            try:
                aws_health = self._aws_service.health_check()
                status.aws_s3 = aws_health.get("s3", False)
                status.aws_athena = aws_health.get("athena", False)
            except Exception:
                status.aws_s3 = False
                status.aws_athena = False
        
        # Check Firebase
        if self._firebase_service:
            try:
                status.firebase = self._firebase_service.health_check()
            except Exception:
                status.firebase = False
        
        return status


# Global service container
_service_container: Optional[ServiceContainer] = None


def get_service_container() -> ServiceContainer:
    """Get the global service container"""
    global _service_container
    if _service_container is None:
        _service_container = ServiceContainer()
        _service_container.initialize()
    return _service_container


# FastAPI dependency functions
def get_openai_service() -> Optional[OpenAIService]:
    """FastAPI dependency for OpenAI service"""
    return get_service_container().openai_service


def get_aws_service() -> Optional[AWSService]:
    """FastAPI dependency for AWS service"""
    return get_service_container().aws_service


def get_firebase_service() -> Optional[FirebaseService]:
    """FastAPI dependency for Firebase service"""
    return get_service_container().firebase_service


def get_parking_service() -> ParkingService:
    """FastAPI dependency for parking service"""
    return get_service_container().parking_service


def get_service_status() -> ServiceStatus:
    """FastAPI dependency for service status"""
    return get_service_container().get_service_status()

"""
Custom Exception Classes and Error Handlers
Centralized error handling for the application
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import structlog
from datetime import datetime

from models.responses import ErrorResponse

log = structlog.get_logger()


class ParkingAnalysisError(Exception):
    """Custom exception for parking analysis errors"""
    def __init__(self, message: str, error_type: str = "analysis_error"):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)


class ServiceUnavailableError(Exception):
    """Custom exception for service unavailability"""
    def __init__(self, service_name: str, message: str = None):
        self.service_name = service_name
        self.message = message or f"{service_name} service is unavailable"
        super().__init__(self.message)


class InvalidImageError(Exception):
    """Custom exception for invalid image data"""
    def __init__(self, message: str = "Invalid image data"):
        self.message = message
        super().__init__(self.message)


async def parking_analysis_exception_handler(request: Request, exc: ParkingAnalysisError):
    """Handle parking analysis errors"""
    log.error(f"Parking analysis error: {exc.message}")
    
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            detail=exc.message,
            status_code=422,
            error_type=exc.error_type,
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


async def service_unavailable_exception_handler(request: Request, exc: ServiceUnavailableError):
    """Handle service unavailable errors"""
    log.error(f"Service unavailable: {exc.service_name} - {exc.message}")
    
    return JSONResponse(
        status_code=503,
        content=ErrorResponse(
            detail=exc.message,
            status_code=503,
            error_type="service_unavailable",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


async def invalid_image_exception_handler(request: Request, exc: InvalidImageError):
    """Handle invalid image errors"""
    log.error(f"Invalid image error: {exc.message}")
    
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            detail=exc.message,
            status_code=400,
            error_type="invalid_image",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    log.error(f"Validation error: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            detail=f"Validation error: {str(exc)}",
            status_code=422,
            error_type="validation_error",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    log.error(f"HTTP error {exc.status_code}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=str(exc.detail),
            status_code=exc.status_code,
            error_type="http_error",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    log.error(f"Unexpected error: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail="An unexpected error occurred",
            status_code=500,
            error_type="internal_error",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )

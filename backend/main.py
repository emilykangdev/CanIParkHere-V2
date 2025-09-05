"""
CanIParkHere API - Restructured Main Application
Clean architecture with proper separation of concerns
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import structlog
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import restructured modules
from config.settings import settings
from routes.parking import router as parking_router
from routes.health import router as health_router
from routes.auth import router as auth_router
from core.dependencies import get_service_container
from core.exceptions import (
    ParkingAnalysisError,
    ServiceUnavailableError,
    InvalidImageError,
    parking_analysis_exception_handler,
    service_unavailable_exception_handler,
    invalid_image_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

log = structlog.get_logger()

# Create FastAPI application
app = FastAPI(
    title=settings.title,
    version=settings.version,
    description="AI-powered parking sign analysis and location-based parking search API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    log.info(
        "Incoming request",
        method=request.method,
        url=str(request.url),
        origin=request.headers.get('origin', 'No origin header'),
        user_agent=request.headers.get('user-agent', 'No user-agent')
    )
    
    response = await call_next(request)
    
    log.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code
    )
    
    return response

# Register exception handlers
app.add_exception_handler(ParkingAnalysisError, parking_analysis_exception_handler)
app.add_exception_handler(ServiceUnavailableError, service_unavailable_exception_handler)
app.add_exception_handler(InvalidImageError, invalid_image_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(parking_router)
app.include_router(health_router)
app.include_router(auth_router)

# Application lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    log.info("Starting CanIParkHere API...")
    
    # Initialize service container
    service_container = get_service_container()
    
    # Log service status
    status = service_container.get_service_status()
    log.info(
        "Service initialization completed",
        openai_available=status.openai,
        aws_s3_available=status.aws_s3,
        aws_athena_available=status.aws_athena,
        firebase_available=status.firebase
    )
    
    if not status.openai:
        log.warning("OpenAI service not available - image analysis will be disabled")
    
    log.info("CanIParkHere API started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    log.info("Shutting down CanIParkHere API...")
    # Add any cleanup logic here
    log.info("CanIParkHere API shutdown complete")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "CanIParkHere API",
        "version": settings.version,
        "docs": "/docs",
        "health": "/api/health"
    }


# Development server
if __name__ == "__main__":
    uvicorn.run(
        "main_new:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )

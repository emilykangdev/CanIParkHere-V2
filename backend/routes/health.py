"""
Health Check Routes
System health and service status endpoints
"""

from fastapi import APIRouter, Depends
from datetime import datetime
import structlog

from models.responses import HealthCheckResponse
from models.internal import ServiceStatus
from core.dependencies import get_service_status

log = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(
    service_status: ServiceStatus = Depends(get_service_status)
):
    """
    Check the health of the API and its services
    
    Returns the status of all integrated services including:
    - OpenAI GPT-4 Vision API
    - AWS S3 and Athena
    - Firebase (if configured)
    
    Status can be 'healthy' or 'unhealthy' based on critical service availability.
    """
    log.info("Health check requested")
    
    # Determine overall health
    is_healthy = service_status.all_healthy
    
    response = HealthCheckResponse(
        status="healthy" if is_healthy else "unhealthy",
        services=service_status.status_summary,
        timestamp=datetime.utcnow().isoformat(),
        error=None if is_healthy else "One or more critical services are unavailable"
    )
    
    log.info(f"Health check completed: {response.status}")
    return response


@router.get("/health/services")
async def detailed_service_status(
    service_status: ServiceStatus = Depends(get_service_status)
):
    """
    Get detailed status of all services
    
    Returns detailed information about each service's availability
    and configuration status.
    """
    log.info("Detailed service status requested")
    
    return {
        "openai": {
            "configured": service_status.openai,
            "status": "healthy" if service_status.openai else "unavailable"
        },
        "aws": {
            "s3": {
                "configured": service_status.aws_s3,
                "status": "healthy" if service_status.aws_s3 else "unavailable"
            },
            "athena": {
                "configured": service_status.aws_athena,
                "status": "healthy" if service_status.aws_athena else "unavailable"
            }
        },
        "firebase": {
            "configured": service_status.firebase,
            "status": "healthy" if service_status.firebase else "unavailable"
        },
        "overall": {
            "status": "healthy" if service_status.all_healthy else "degraded",
            "critical_services_ok": service_status.all_healthy
        }
    }

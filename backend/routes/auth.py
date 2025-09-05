"""
Authentication Routes
Firebase token generation and auth-related endpoints
"""

from fastapi import APIRouter, Request, HTTPException
import structlog

log = structlog.get_logger()

router = APIRouter(tags=["authentication"])


@router.post("/get-firebase-token")
async def get_firebase_token(request: Request):
    """
    Generate Firebase custom token for Clerk user authentication
    
    Expects Authorization header with format: "Bearer <clerk_user_id>"
    Returns Firebase custom token for client-side Firebase auth
    """
    log.info("Firebase token request received")
    
    # Get Clerk user ID from frontend
    auth_header = request.headers.get("Authorization")  # "Bearer <user_id>"
    if not auth_header:
        log.error("Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        clerk_user_id = auth_header.replace("Bearer ", "").strip()
        if not clerk_user_id:
            log.error("Empty user ID in Authorization header")
            raise HTTPException(status_code=401, detail="Empty user ID")
    except Exception as e:
        log.error(f"Invalid Authorization header format: {e}")
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    # Create Firebase custom token for this Clerk user ID
    try:
        import firebase_admin
        from firebase_admin import auth
        
        # Check if Firebase is initialized
        if not firebase_admin._apps:
            log.error("Firebase not initialized")
            raise HTTPException(status_code=503, detail="Firebase service not available")
        
        firebase_token = auth.create_custom_token(clerk_user_id)
        
        log.info(f"Firebase token created for user: {clerk_user_id}")
        return {"customToken": firebase_token.decode()}
        
    except ImportError:
        log.error("Firebase Admin SDK not available")
        raise HTTPException(status_code=503, detail="Firebase service not configured")
    except Exception as e:
        log.error(f"Failed to create Firebase token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create Firebase token: {str(e)}")

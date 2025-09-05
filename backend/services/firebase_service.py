"""
Firebase Service for Authentication and Data Storage
Clean service layer for Firebase Admin SDK operations
"""

import json
from typing import Optional
import structlog
import firebase_admin
from firebase_admin import credentials, auth

from config.settings import settings

log = structlog.get_logger()


class FirebaseService:
    """Service for Firebase Admin SDK operations"""
    
    def __init__(self, service_account_json: str):
        """Initialize Firebase service with service account"""
        try:
            service_account_info = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_info)
            
            # Initialize Firebase app if not already initialized
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
                log.info("Firebase initialized successfully")
            else:
                log.info("Firebase already initialized")
                
        except json.JSONDecodeError as e:
            log.error(f"Invalid Firebase service account JSON: {e}")
            raise ValueError("Invalid Firebase service account configuration")
        except Exception as e:
            log.error(f"Firebase initialization failed: {e}")
            raise RuntimeError(f"Firebase initialization failed: {str(e)}")
    
    def create_custom_token(self, user_id: str) -> str:
        """
        Create Firebase custom token for user authentication
        
        Args:
            user_id: Clerk user ID to create token for
            
        Returns:
            Firebase custom token as string
        """
        try:
            firebase_token = auth.create_custom_token(user_id)
            log.info(f"Created Firebase custom token for user: {user_id}")
            return firebase_token.decode()
        except Exception as e:
            log.error(f"Failed to create custom token for user {user_id}: {e}")
            raise RuntimeError(f"Failed to create Firebase token: {str(e)}")
    
    def verify_token(self, token: str) -> dict:
        """
        Verify Firebase ID token
        
        Args:
            token: Firebase ID token to verify
            
        Returns:
            Decoded token claims
        """
        try:
            decoded_token = auth.verify_id_token(token)
            log.info(f"Verified token for user: {decoded_token.get('uid')}")
            return decoded_token
        except Exception as e:
            log.error(f"Token verification failed: {e}")
            raise RuntimeError(f"Token verification failed: {str(e)}")
    
    def health_check(self) -> bool:
        """Check if Firebase service is healthy"""
        try:
            # Simple check - try to create a test token
            # This will fail if Firebase is not properly initialized
            test_token = auth.create_custom_token("health_check_test")
            return bool(test_token)
        except Exception as e:
            log.error(f"Firebase health check failed: {e}")
            return False


# Service factory function
def create_firebase_service() -> Optional[FirebaseService]:
    """Create Firebase service if configured"""
    if not settings.has_firebase_config:
        log.warning("Firebase not configured")
        return None
    
    try:
        return FirebaseService(settings.firebase_service_account)
    except Exception as e:
        log.error(f"Failed to create Firebase service: {e}")
        return None

import os
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Union
import logging
from uuid import UUID

# from backend.app.config import settings

logger = logging.getLogger(__name__)

# Password hashing configuration
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto"
)


# JWT Configuration from validated settings
SECRET_KEY = os.getenv('JWT_SECRET_KEY')
REFRESH_SECRET_KEY = os.getenv('JWT_REFRESH_SECRET_KEY')
ALGORITHM = os.getenv('JWT_ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES'))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS'))

class PasswordManager:
    """Handles password hashing and verification"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

class TokenManager:
    """Handles JWT token creation and verification"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()

        for key, value in to_encode.items():
            if isinstance(value, UUID):
                to_encode[key] = str(value)

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT refresh token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, is_refresh: bool = False) -> Optional[dict]:
        """Verify and decode a JWT token"""
        try:
            secret_key = REFRESH_SECRET_KEY if is_refresh else SECRET_KEY
            payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def create_tokens_for_user(user_data: dict) -> tuple[str, str]:
        """Create both access and refresh tokens for a user with all required payload fields"""
        import uuid
        
        # Generate unique token ID
        token_id = str(uuid.uuid4())
        
        # Current timestamp
        now = datetime.utcnow()
        
        # Access token payload with all required fields
        access_payload = {
            "username": user_data["username"],
            "user_id": str(user_data["user_id"]),
            "role": user_data["role"],
            "first_access": user_data.get("first_access", True),
            "token_id": token_id,
            "iat": now,
            "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "type": "access"
        }
        
        # Refresh token payload (simplified)
        refresh_payload = {
            "user_id": str(user_data["user_id"]),
            "username": user_data["username"],
            "token_id": token_id,
            "iat": now,
            "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "type": "refresh"
        }
        
        access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)
        refresh_token = jwt.encode(refresh_payload, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
        
        return access_token, refresh_token
    
    @staticmethod
    def create_token_for_user(user_id: str, username: str, role: str = "user") -> str:
        """Create a token specifically for a user (legacy method for backward compatibility)"""
        data = {
            "sub": user_id,
            "username": username,
            "role": role
        }
        return TokenManager.create_access_token(data)

# Convenience functions for backward compatibility
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return PasswordManager.hash_password(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return PasswordManager.verify_password(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    return TokenManager.create_access_token(data, expires_delta)

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    return TokenManager.verify_token(token)
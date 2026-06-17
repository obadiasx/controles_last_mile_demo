"""
Custom exception classes for the Access Control API
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class AccessControlException(Exception):
    """Base exception class for Access Control API"""

    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseException(AccessControlException):
    """Database-related exceptions"""

    def __init__(self, message: str = "Database operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class AuthenticationException(AccessControlException):
    """Authentication-related exceptions"""

    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)


class AuthorizationException(AccessControlException):
    """Authorization-related exceptions"""

    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_403_FORBIDDEN, details)


class ValidationException(AccessControlException):
    """Validation-related exceptions"""

    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class NotFoundException(AccessControlException):
    """Resource not found exceptions"""

    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_404_NOT_FOUND, details)


class ConflictException(AccessControlException):
    """Resource conflict exceptions"""

    def __init__(self, message: str = "Resource conflict", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status.HTTP_409_CONFLICT, details)


def create_http_exception(exc: AccessControlException) -> HTTPException:
    """Convert custom exception to HTTPException"""
    return HTTPException(
        status_code=exc.status_code,
        detail={
            "message": exc.message,
            "details": exc.details
        }
    )

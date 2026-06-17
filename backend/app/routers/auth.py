from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..repositories.user import UserCRUD
from backend.app.core.database import get_local_db_session
from ..services.auth import TokenManager

router = APIRouter()


class JWTRequest(BaseModel):
    """Request model for JWT token generation"""
    username: str = Field(..., description="Username for authentication")
    password: str = Field(..., description="Password for authentication")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "xaviver",
                "password": "password123"
            }
        }


class JWTResponse(BaseModel):
    """Response model for JWT token generation"""
    accessToken: str = Field(..., description="JWT access token with Bearer prefix")
    refreshToken: str = Field(..., description="JWT refresh token with Bearer prefix")

    class Config:
        json_schema_extra = {
            "example": {
                "accessToken": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refreshToken": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


# @router.post("/getjwt", response_model=JWTResponse)
# async def get_jwt_token(
#         request: JWTRequest,
#         db: AsyncSession = Depends(get_local_db_session)
# ):
#     """
#     Generate JWT token for authenticated user
#
#     This endpoint authenticates a user with username and password,
#     then returns a JWT access token that can be used for subsequent API calls.
#
#     - **username**: Username for authentication
#     - **password**: Password for authentication
#
#     Returns a JWT token with user information if authentication is successful.
#     """
#
#     # Authenticate user
#     user = await UserCRUD.authenticate_user(db, request.username, request.password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid username or password"
#         )
#
#     # Prepare user data for token creation
#     user_data = {
#         "username": user.username,
#         "user_id": user.id,
#         "role": user.role_id,
#         "first_access": user.first_access
#     }
#
#     # Create both access and refresh tokens
#     access_token, refresh_token = TokenManager.create_tokens_for_user(user_data)
#
#     return JWTResponse(
#         accessToken=f"Bearer {access_token}",
#         refreshToken=f"Bearer {refresh_token}"
#     )


class JWTValidationResponse(BaseModel):
    """Response model for JWT token validation"""
    username: str = Field(..., description="Username from token")
    user_id: str = Field(..., description="User ID from token")
    role: str = Field(..., description="User role from token")
    first_access: bool = Field(..., description="First access flag from token")
    exp: int = Field(..., description="Token expiration timestamp")
    iat: int = Field(..., description="Token issued at timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "xaviver",
                "user_id": "037342ea-c071-452d-b894-bbba150cd86a",
                "role": "Professor",
                "first_access": False,
                "exp": 1758674706,
                "iat": 1758667506
            }
        }


# @router.post("/validatejwt", response_model=JWTValidationResponse)
# async def validate_jwt_token(
#         authorization: str = Header(..., description="Authorization header with Bearer token"),
#         db: AsyncSession = Depends(get_local_db_session)
# ):
#     """
#     Validate JWT token and return user information
#
#     This endpoint validates a JWT token from the Authorization header
#     and returns the user information contained in the token.
#
#     - **Authorization**: Bearer token in the format "Bearer <jwt_token>"
#
#     Returns user information from the token if validation is successful.
#     """
#
#     # Extract token from Authorization header
#     if not authorization.startswith("Bearer "):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid authorization header format. Expected 'Bearer <token>'"
#         )
#
#     token = authorization[7:]  # Remove "Bearer " prefix
#
#     # Validate the token
#     payload = TokenManager.verify_token(token)
#     if not payload:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid or expired token"
#         )
#
#     # Check if token is an access token (not refresh token)
#     if payload.get("type") == "refresh":
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Refresh token not accepted for validation. Use access token."
#         )
#
#     # Extract required fields from token payload
#     try:
#         username = payload.get("username")
#         user_id = payload.get("user_id")
#         role = payload.get("role")
#         first_access = payload.get("first_access", True)
#         exp = payload.get("exp")
#         iat = payload.get("iat")
#
#         # Validate required fields are present
#         if not all([username, user_id, role, exp, iat]):
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid token payload. Missing required fields."
#             )
#
#         # Optional: Verify user still exists and is enabled (for extra security)
#         user = await UserCRUD.get_user_by_id(db, user_id)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="User not found. Token may be invalid."
#             )
#
#         if not user.enabled:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="User account is disabled."
#             )
#
#         return JWTValidationResponse(
#             username=username,
#             user_id=user_id,
#             role=role,
#             first_access=first_access,
#             exp=exp,
#             iat=iat
#         )
#
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail=f"Token validation failed: {str(e)}"
#         )

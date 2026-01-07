from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.models.user import UserLogin, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, create_admin_user
from app.utils.security import create_access_token
from app.config import get_settings
from pymongo.database import Database

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Database = Depends(get_database)):
    """
    Admin login endpoint
    Returns JWT token and user information
    """
    # Ensure admin user exists (first-time setup)
    await create_admin_user(
        db,
        settings.ADMIN_USERNAME,
        settings.ADMIN_PASSWORD,
        settings.ADMIN_FULL_NAME
    )
    
    # Authenticate user
    user = await authenticate_user(db, credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    
    # Prepare user response
    user["_id"] = str(user["_id"])
    user_response = UserResponse(**user)
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )

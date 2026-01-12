from fastapi import APIRouter, Depends, HTTPException, status
from app.wowsql_client import users as get_users_table
from app.models.user import UserLogin, TokenResponse, UserResponse
from app.utils.security import create_access_token, get_password_hash, verify_password
from app.config import get_settings
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


async def get_user_by_username(username: str):
    """Get user by username"""
    users_table = get_users_table()
    return users_table.find_one(filters={"username": username})


async def authenticate_user(username: str, password: str):
    """Authenticate user with username and password"""
    user = await get_user_by_username(username)
    
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
    
    if not user.get("is_active", True):
        return None
    
    return user


async def create_admin_user(username: str, password: str, full_name: str):
    """Create admin user (used for initial setup)"""
    users_table = get_users_table()
    
    existing_user = await get_user_by_username(username)
    
    if existing_user:
        return existing_user
    
    user_doc = {
        "username": username,
        "password_hash": get_password_hash(password),
        "full_name": full_name,
        "role": "admin",
        "created_at": datetime.utcnow().isoformat(),
        "is_active": True
    }
    
    new_user = users_table.insert_one(user_doc)
    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Admin login endpoint
    Returns JWT token and user information
    """
    # Ensure admin user exists (first-time setup)
    await create_admin_user(
        settings.ADMIN_USERNAME,
        settings.ADMIN_PASSWORD,
        settings.ADMIN_FULL_NAME
    )
    
    # Authenticate user
    user = await authenticate_user(credentials.username, credentials.password)
    
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
    user_response = UserResponse(**user)
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )

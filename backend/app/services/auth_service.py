from datetime import datetime
from bson import ObjectId
from pymongo.database import Database
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.models.user import UserResponse
from typing import Optional


async def get_user_by_username(db: Database, username: str) -> Optional[dict]:
    """Get user by username"""
    return db.users.find_one({"username": username})


async def authenticate_user(db: Database, username: str, password: str) -> Optional[dict]:
    """Authenticate user with username and password"""
    user = await get_user_by_username(db, username)
    
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
    
    if not user.get("is_active", True):
        return None
    
    return user


async def create_admin_user(db: Database, username: str, password: str, full_name: str) -> dict:
    """Create admin user (used for initial setup)"""
    existing_user = await get_user_by_username(db, username)
    
    if existing_user:
        return existing_user
    
    user_doc = {
        "username": username,
        "password_hash": get_password_hash(password),
        "full_name": full_name,
        "role": "admin",
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    return user_doc

from pymongo import MongoClient
from pymongo.database import Database
from app.config import get_settings

settings = get_settings()

# MongoDB client (singleton)
_client: MongoClient = None
_database: Database = None


def get_database() -> Database:
    """Get MongoDB database instance (singleton pattern)"""
    global _client, _database
    
    if _database is None:
        _client = MongoClient(settings.MONGODB_URI)
        _database = _client.get_database()
    
    return _database


def close_database():
    """Close MongoDB connection"""
    global _client, _database
    
    if _client:
        _client.close()
        _client = None
        _database = None

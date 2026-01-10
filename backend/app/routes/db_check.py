"""
Database diagnostic endpoint for troubleshooting connection issues.
"""

from fastapi import APIRouter, Depends
from app.database import get_database
from pymongo.database import Database
from app.config import get_settings

router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/db-status")
async def db_status(db: Database = Depends(get_database)):
    """
    Check database connection and return collection stats.
    Use this to verify:
    - Correct database is connected
    - Data exists in collections
    """
    settings = get_settings()
    
    try:
        # Get collection counts
        bills_count = db.bills.count_documents({})
        payments_count = db.payments.count_documents({})
        products_count = db.products.count_documents({})
        inventory_count = db.inventory.count_documents({})
        expenses_count = db.expenses.count_documents({})
        
        # Mask the URI for security (show only host)
        uri = settings.MONGODB_URI
        masked_uri = uri.split('@')[1].split('/')[0] if '@' in uri else 'unknown'
        
        return {
            "success": True,
            "connected": True,
            "database_name": db.name,
            "cluster_host": masked_uri,
            "collections": {
                "bills": bills_count,
                "payments": payments_count,
                "products": products_count,
                "inventory": inventory_count,
                "expenses": expenses_count,
            },
            "message": f"Connected to {db.name} with {bills_count} bills"
        }
    except Exception as e:
        return {
            "success": False,
            "connected": False,
            "error": str(e)
        }


@router.get("/env-check")
async def env_check():
    """
    Check if critical environment variables are set.
    Does NOT expose actual values for security.
    """
    settings = get_settings()
    
    return {
        "MONGODB_URI": "SET" if settings.MONGODB_URI else "MISSING",
        "JWT_SECRET_KEY": "SET" if settings.JWT_SECRET_KEY else "MISSING",
        "ADMIN_USERNAME": "SET" if settings.ADMIN_USERNAME else "MISSING",
        "APP_NAME": settings.APP_NAME,
        "DEBUG": settings.DEBUG,
    }

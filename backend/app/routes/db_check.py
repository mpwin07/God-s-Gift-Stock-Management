"""
Database diagnostic endpoint for troubleshooting connection issues.
"""

from fastapi import APIRouter
from app.wowsql_client import get_client, products, bills, payments, expenses
from app.config import get_settings

router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/db-status")
async def db_status():
    """
    Check database connection and return table stats.
    Use this to verify:
    - WowSQL is connected
    - Data exists in tables
    """
    settings = get_settings()
    
    try:
        # Get table counts
        bills_count = len(bills().find())
        payments_count = len(payments().find())
        products_count = len(products().find())
        expenses_count = len(expenses().find())
        
        return {
            "success": True,
            "connected": True,
            "database": "WowSQL",
            "base_url": settings.WOWSQL_BASE_URL,
            "tables": {
                "bills": bills_count,
                "payments": payments_count,
                "products": products_count,
                "expenses": expenses_count,
            },
            "message": f"Connected to WowSQL with {bills_count} bills"
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
        "WOWSQL_BASE_URL": "SET" if settings.WOWSQL_BASE_URL else "MISSING",
        "WOWSQL_API_KEY": "SET" if settings.WOWSQL_API_KEY else "MISSING",
        "JWT_SECRET_KEY": "SET" if settings.JWT_SECRET_KEY else "MISSING",
        "ADMIN_USERNAME": "SET" if settings.ADMIN_USERNAME else "MISSING",
        "APP_NAME": settings.APP_NAME,
        "DEBUG": settings.DEBUG,
    }

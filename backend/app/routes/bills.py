from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database import get_database
from app.models.bill import BillCreate, BillResponse
from app.services.bill_service import create_bill_with_payment
from pymongo.database import Database
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter(prefix="/bills", tags=["Bills"])


def bill_helper(bill: dict) -> dict:
    """Convert MongoDB document to response format"""
    bill["_id"] = str(bill["_id"])
    return bill


@router.get("", response_model=List[BillResponse])
async def get_bills(
    customer_name: Optional[str] = Query(None, description="Filter by customer name"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Number of bills to return"),
    db: Database = Depends(get_database)
):
    """Get all bills with optional filters"""
    query = {}
    
    # Filter by customer name (case-insensitive partial match)
    if customer_name:
        query["customer_name"] = {"$regex": customer_name, "$options": "i"}
    
    # Filter by date range
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                date_query["$gte"] = start_dt
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use YYYY-MM-DD"
                )
        
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                date_query["$lt"] = end_dt
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use YYYY-MM-DD"
                )
        
        query["bill_date"] = date_query
    
    # Get bills
    bills = list(db.bills.find(query).sort("bill_date", -1).limit(limit))
    
    # If payment_status filter, join with payments
    if payment_status:
        bill_ids = [bill["_id"] for bill in bills]
        payments = list(db.payments.find({
            "bill_id": {"$in": bill_ids},
            "payment_status": payment_status
        }))
        payment_bill_ids = {p["bill_id"] for p in payments}
        bills = [b for b in bills if b["_id"] in payment_bill_ids]
    
    return [bill_helper(b) for b in bills]


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(bill: BillCreate, db: Database = Depends(get_database)):
    """
    Create a new bill
    - Validates stock availability
    - Generates bill number
    - Creates payment record
    - Reduces inventory stock
    """
    try:
        bill_doc, payment_doc = await create_bill_with_payment(db, bill)
        return bill_helper(bill_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bill: {str(e)}"
        )


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: str, db: Database = Depends(get_database)):
    """Get bill by ID"""
    try:
        bill = db.bills.find_one({"_id": ObjectId(bill_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bill ID format"
        )
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return bill_helper(bill)

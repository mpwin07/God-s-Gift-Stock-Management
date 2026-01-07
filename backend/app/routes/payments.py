from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database import get_database
from app.models.payment import PaymentUpdate, PaymentResponse
from pymongo.database import Database
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/payments", tags=["Payments"])


def payment_helper(payment: dict) -> dict:
    """Convert MongoDB document to response format"""
    payment["_id"] = str(payment["_id"])
    payment["bill_id"] = str(payment["bill_id"])
    return payment


def calculate_payment_status(amount_paid: float, bill_total: float) -> str:
    """Calculate payment status based on amount paid"""
    balance = bill_total - amount_paid
    
    if balance <= 0:
        return "Completed"
    elif amount_paid > 0:
        return "Partial"
    else:
        return "Pending"


@router.get("", response_model=List[PaymentResponse])
async def get_payments(
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_database)
):
    """Get all payments with optional filters"""
    query = {}
    
    if payment_status:
        query["payment_status"] = payment_status
    
    payments = list(db.payments.find(query).sort("updated_at", -1).limit(limit))
    return [payment_helper(p) for p in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, db: Database = Depends(get_database)):
    """Get payment by ID"""
    try:
        payment = db.payments.find_one({"_id": ObjectId(payment_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment ID format"
        )
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return payment_helper(payment)


@router.get("/bill/{bill_id}", response_model=PaymentResponse)
async def get_payment_by_bill(bill_id: str, db: Database = Depends(get_database)):
    """Get payment by bill ID"""
    try:
        payment = db.payments.find_one({"bill_id": ObjectId(bill_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bill ID format"
        )
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found for this bill"
        )
    
    return payment_helper(payment)


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_update: PaymentUpdate,
    db: Database = Depends(get_database)
):
    """Update payment details"""
    try:
        obj_id = ObjectId(payment_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment ID format"
        )
    
    # Get existing payment
    existing = db.payments.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow(),
    }
    
    if payment_update.updated_by:
        update_data["updated_by"] = payment_update.updated_by
    
    # Handle amount_paid update
    if payment_update.amount_paid is not None:
        if payment_update.amount_paid > existing["bill_total"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount paid ({payment_update.amount_paid}) cannot exceed bill total ({existing['bill_total']})"
            )
        
        update_data["amount_paid"] = payment_update.amount_paid
        update_data["balance_due"] = existing["bill_total"] - payment_update.amount_paid
        update_data["payment_status"] = calculate_payment_status(payment_update.amount_paid, existing["bill_total"])
    
    # Handle direct payment_status update
    if payment_update.payment_status:
        update_data["payment_status"] = payment_update.payment_status
        # Auto-mark delivery as Completed when payment is Completed
        if payment_update.payment_status == "Completed":
            update_data["delivery_status"] = "Completed"
            update_data["amount_paid"] = existing["bill_total"]
            update_data["balance_due"] = 0
            # Track when payment was completed (current date, not bill date)
            from datetime import timezone, timedelta
            IST = timezone(timedelta(hours=5, minutes=30))
            update_data["payment_completed_date"] = datetime.now(IST).replace(tzinfo=None)
    
    # Handle delivery_status update
    if payment_update.delivery_status:
        update_data["delivery_status"] = payment_update.delivery_status
    
    if payment_update.payment_mode:
        update_data["payment_mode"] = payment_update.payment_mode.value
        update_data["payment_date"] = datetime.utcnow()
    
    if payment_update.notes:
        update_data["notes"] = payment_update.notes
    
    # Update payment
    db.payments.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )
    
    # Get updated payment
    updated_payment = db.payments.find_one({"_id": obj_id})
    return payment_helper(updated_payment)


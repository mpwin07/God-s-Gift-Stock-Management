from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.wowsql_client import payments as get_payments_table
from app.models.payment import PaymentUpdate, PaymentResponse
from datetime import datetime, timezone, timedelta
from typing import List, Optional

router = APIRouter(prefix="/payments", tags=["Payments"])

# India Standard Time
IST = timezone(timedelta(hours=5, minutes=30))


def payment_helper(payment: dict) -> dict:
    """Convert WowSQL record to response format"""
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
    limit: int = Query(100, ge=1, le=500)
):
    """Get all payments with optional filters"""
    payments_table = get_payments_table()
    
    filters = {}
    if payment_status:
        filters["payment_status"] = payment_status
    
    payments = payments_table.find(
        filters=filters,
        order_by="updated_at",
        order_dir="desc",
        limit=limit
    )
    return [payment_helper(p) for p in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int):
    """Get payment by ID"""
    payments_table = get_payments_table()
    
    payment = payments_table.find_one(id=payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return payment_helper(payment)


@router.get("/bill/{bill_id}", response_model=PaymentResponse)
async def get_payment_by_bill(bill_id: int):
    """Get payment by bill ID"""
    payments_table = get_payments_table()
    
    payment = payments_table.find_one(filters={"bill_id": bill_id})
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found for this bill"
        )
    
    return payment_helper(payment)


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate
):
    """Update payment details"""
    payments_table = get_payments_table()
    
    # Get existing payment
    existing = payments_table.find_one(id=payment_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Prepare update data
    update_data = {
        "updated_at": datetime.utcnow().isoformat(),
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
            # Track when payment was completed
            update_data["payment_completed_date"] = datetime.now(IST).replace(tzinfo=None).isoformat()
    
    # Handle delivery_status update
    if payment_update.delivery_status:
        update_data["delivery_status"] = payment_update.delivery_status
    
    if payment_update.payment_mode:
        update_data["payment_mode"] = payment_update.payment_mode.value
        update_data["payment_date"] = datetime.utcnow().isoformat()
    
    if payment_update.notes:
        update_data["notes"] = payment_update.notes
    
    # Update payment
    updated_payment = payments_table.update_one(payment_id, update_data)
    
    return payment_helper(updated_payment)

from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.wowsql_client import bills as get_bills_table, payments as get_payments_table, bill_sequences as get_sequences_table
from app.models.bill import BillCreate, BillResponse
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import json

router = APIRouter(prefix="/bills", tags=["Bills"])

# India Standard Time
IST = timezone(timedelta(hours=5, minutes=30))


def bill_helper(bill: dict) -> dict:
    """Convert WowSQL record to response format"""
    # Parse items JSON if it's a string
    if isinstance(bill.get("items"), str):
        bill["items"] = json.loads(bill["items"])
    return bill


async def generate_bill_number() -> str:
    """Generate unique bill number: BILL-YYYYMMDD-XXXX
    
    Uses a robust approach: count today's bills to determine the next sequence number.
    This avoids issues with the sequence table's id not being returned.
    """
    bills_table = get_bills_table()
    today = datetime.utcnow()
    date_str = today.strftime("%Y%m%d")
    
    # Get all bills from today to count them
    today_prefix = f"BILL-{date_str}-"
    all_bills = bills_table.find(limit=500)  # Get recent bills
    
    # Count bills that match today's date prefix
    today_bills = [b for b in all_bills if b.get("bill_number", "").startswith(today_prefix)]
    new_seq = len(today_bills) + 1
    
    bill_number = f"BILL-{date_str}-{new_seq:04d}"
    return bill_number


@router.get("", response_model=List[BillResponse])
async def get_bills(
    customer_name: Optional[str] = Query(None, description="Filter by customer name"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Number of bills to return")
):
    """Get all bills with optional filters"""
    bills_table = get_bills_table()
    payments_table = get_payments_table()
    
    filters = {}
    
    # Filter by customer name (exact match for now)
    if customer_name:
        filters["customer_name"] = customer_name
    
    # Get bills sorted by date descending
    bills = bills_table.find(filters=filters, order_by="bill_date", order_dir="desc", limit=limit)
    
    # Filter by date range
    if start_date or end_date:
        filtered_bills = []
        for bill in bills:
            bill_date = bill.get("bill_date")
            if isinstance(bill_date, str):
                bill_date = datetime.fromisoformat(bill_date.replace("Z", "+00:00"))
            
            include = True
            if start_date:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                if bill_date < start_dt:
                    include = False
            if end_date:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                if bill_date >= end_dt:
                    include = False
            
            if include:
                filtered_bills.append(bill)
        bills = filtered_bills
    
    # Filter by payment status
    if payment_status:
        bill_ids = [bill["id"] for bill in bills]
        payments = payments_table.find(filters={"payment_status": payment_status})
        payment_bill_ids = {p["bill_id"] for p in payments}
        bills = [b for b in bills if b["id"] in payment_bill_ids]
    
    return [bill_helper(b) for b in bills]


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(bill: BillCreate):
    """Create a new bill"""
    bills_table = get_bills_table()
    payments_table = get_payments_table()
    
    try:
        # Convert items to dicts
        items_data = [item.model_dump() for item in bill.items]
        
        # Generate bill number
        bill_number = await generate_bill_number()
        
        # Determine bill date
        now_ist = datetime.now(IST).replace(tzinfo=None)
        bill_date = bill.bill_date if bill.bill_date else now_ist
        
        # Create bill document
        bill_doc = {
            "bill_number": bill_number,
            "batch_number": bill.batch_number,
            "customer_name": bill.customer_name,
            "customer_phone": bill.customer_phone,
            "customer_address": bill.customer_address,
            "bill_date": bill_date.isoformat(),
            "items": items_data,
            "bill_total": bill.bill_total,
            "order_source": bill.order_source.value,
            "created_by": bill.created_by,
            "created_at": now_ist.isoformat(),
            "notes": bill.notes
        }
        
        new_bill = bills_table.insert_one(bill_doc)
        
        # Handle case where insert doesn't return id
        if not new_bill or "id" not in new_bill:
            # Fallback: Query for the bill we just created by bill_number
            new_bill = bills_table.find_one(filters={"bill_number": bill_number})
            if not new_bill or "id" not in new_bill:
                raise Exception("Failed to retrieve created bill ID")
        
        # Create payment record
        payment_doc = {
            "bill_id": new_bill["id"],
            "bill_number": bill_number,
            "bill_total": bill.bill_total,
            "payment_status": "Pending",
            "delivery_status": "Pending",
            "amount_paid": 0.0,
            "balance_due": bill.bill_total,
            "payment_mode": None,
            "payment_date": None,
            "payment_completed_date": None,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": None,
            "notes": None
        }
        payments_table.insert_one(payment_doc)
        
        return bill_helper(new_bill)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bill: {str(e)}"
        )


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: int):
    """Get bill by ID"""
    bills_table = get_bills_table()
    
    bill = bills_table.find_one(id=bill_id)
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return bill_helper(bill)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(bill_id: int):
    """Delete a bill permanently"""
    bills_table = get_bills_table()
    payments_table = get_payments_table()
    
    try:
        bill = bills_table.find_one(id=bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Delete payment
        payment = payments_table.find_one(filters={"bill_id": bill_id})
        if payment:
            payments_table.delete_one(payment["id"])
        
        # Delete bill
        bills_table.delete_one(bill_id)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{bill_id}/items/{item_index}", response_model=BillResponse)
async def delete_bill_item(bill_id: int, item_index: int):
    """Remove a single item from a bill"""
    bills_table = get_bills_table()
    payments_table = get_payments_table()
    
    try:
        bill = bills_table.find_one(id=bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        items = bill.get("items", [])
        if isinstance(items, str):
            items = json.loads(items)
        
        if item_index < 0 or item_index >= len(items):
            raise HTTPException(status_code=400, detail="Invalid item index")
        
        # Remove item and recalculate total
        items.pop(item_index)
        new_total = sum(i.get("item_total", 0) for i in items)
        new_total = round(new_total, 2)
        
        # Update bill
        updated_bill = bills_table.update_one(bill_id, {
            "items": items,
            "bill_total": new_total,
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Update payment
        payment = payments_table.find_one(filters={"bill_id": bill_id})
        if payment:
            paid = payment.get("amount_paid", 0)
            new_balance = new_total - paid
            
            payments_table.update_one(payment["id"], {
                "bill_total": new_total,
                "balance_due": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            })
        
        return bill_helper(updated_bill)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database import get_database
from app.models.bill import BillCreate, BillResponse
from app.services.bill_service import create_bill_with_payment, restore_stock
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

@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(bill_id: str, db: Database = Depends(get_database)):
    """
    Delete a bill permanently
    - Restores inventory stock
    - Deletes bill document
    - Deletes payment document
    """
    try:
        bill = db.bills.find_one({"_id": ObjectId(bill_id)})
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")

        # 1. Restore Stock
        if "items" in bill and bill["items"]:
            await restore_stock(db, bill["items"])

        # 2. Delete Bill and Payment
        db.bills.delete_one({"_id": ObjectId(bill_id)})
        db.payments.delete_one({"bill_id": ObjectId(bill_id)})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{bill_id}/items/{item_index}", response_model=BillResponse)
async def delete_bill_item(bill_id: str, item_index: int, db: Database = Depends(get_database)):
    """
    Remove a single item from a bill
    - Restores stock for that item
    - Recalculates total
    - Updates bill and payment
    """
    try:
        bill = db.bills.find_one({"_id": ObjectId(bill_id)})
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")

        items = bill.get("items", [])
        if item_index < 0 or item_index >= len(items):
            raise HTTPException(status_code=400, detail="Invalid item index")

        # 1. Identify and Restore Stock for the specific item
        item_to_remove = items[item_index]
        await restore_stock(db, [item_to_remove])

        # 2. Remove item and recalculate total
        items.pop(item_index)
        new_total = sum(i.get("item_total", 0) for i in items)
        new_total = round(new_total, 2)

        # 3. Update Bill
        db.bills.update_one(
            {"_id": ObjectId(bill_id)},
            {
                "$set": {
                    "items": items,
                    "bill_total": new_total,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # 4. Update Payment (balance due usually changes)
        # Note: If amount_paid > new_total, balance might be negative (credit)
        payment = db.payments.find_one({"bill_id": ObjectId(bill_id)})
        if payment:
            paid = payment.get("amount_paid", 0)
            new_balance = new_total - paid
            
            db.payments.update_one(
                {"bill_id": ObjectId(bill_id)},
                {
                    "$set": {
                        "bill_total": new_total,
                        "balance_due": new_balance,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

        # Return updated bill
        updated_bill = db.bills.find_one({"_id": ObjectId(bill_id)})
        return bill_helper(updated_bill)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

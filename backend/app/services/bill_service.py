from datetime import datetime
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
from fastapi import HTTPException, status
from app.models.bill import BillCreate, BillItem
from typing import List


async def generate_bill_number(db: Database) -> str:
    """Generate unique bill number: BILL-YYYYMMDD-XXXX"""
    today = datetime.utcnow()
    date_str = today.strftime("%Y%m%d")
    
    # Atomic increment of sequence
    result = db.bill_sequences.find_one_and_update(
        {"_id": date_str},
        {"$inc": {"sequence": 1}},
        upsert=True,
        return_document=True
    )
    
    sequence = result["sequence"]
    bill_number = f"BILL-{date_str}-{sequence:04d}"
    
    return bill_number


async def validate_stock_availability(db: Database, items: List[BillItem]) -> None:
    """Validate that sufficient stock is available for all items"""
    for item in items:
        product_id = ObjectId(item.product_id)
        
        # Get current stock
        inventory = db.inventory.find_one({"product_id": product_id})
        
        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {item.product_name} not found in inventory"
            )
        
        if inventory["current_stock"] < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {item.product_name}. Available: {inventory['current_stock']}, Required: {item.quantity}"
            )


async def reduce_stock(db: Database, items: List[BillItem]) -> None:
    """Reduce stock for all items in the bill"""
    for item in items:
        product_id = ObjectId(item.product_id)
        
        db.inventory.update_one(
            {"product_id": product_id},
            {
                "$inc": {"current_stock": -item.quantity},
                "$set": {"last_updated": datetime.utcnow()}
            }
        )


async def restore_stock(db: Database, items: List[dict]) -> None:
    """Restore stock for a list of items (used when deleting bill or removing item)"""
    for item in items:
        # Handle both object and dictionary access
        p_id = item.get("product_id") if isinstance(item, dict) else item.product_id
        qty = item.get("quantity") if isinstance(item, dict) else item.quantity

        if p_id and qty:
            product_id = ObjectId(p_id)
            db.inventory.update_one(
                {"product_id": product_id},
                {
                    "$inc": {"current_stock": qty},
                    "$set": {"last_updated": datetime.utcnow()}
                }
            )


async def create_bill_with_payment(db: Database, bill_data: BillCreate) -> tuple:
    """
    Create bill and payment record, reduce stock atomically
    Returns: (bill_doc, payment_doc)
    """
    # Step 1: Validate stock availability
    await validate_stock_availability(db, bill_data.items)
    
    # Step 2: Generate bill number
    bill_number = await generate_bill_number(db)
    
    # Step 3: Determine bill date
    # If bill_date is provided, use it; otherwise use current IST time
    from datetime import timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))
    
    if bill_data.bill_date:
        # Use provided date (assumed to be in IST, store as-is for display)
        bill_date = bill_data.bill_date
    else:
        # Use current IST time
        bill_date = datetime.now(IST).replace(tzinfo=None)
    
    # Step 4: Create bill document
    bill_doc = {
        "bill_number": bill_number,
        "batch_number": bill_data.batch_number,
        "customer_name": bill_data.customer_name,
        "customer_phone": bill_data.customer_phone,
        "customer_address": bill_data.customer_address,
        "bill_date": bill_date,
        "items": [item.model_dump() for item in bill_data.items],
        "bill_total": bill_data.bill_total,
        "order_source": bill_data.order_source.value,
        "created_by": bill_data.created_by,
        "created_at": datetime.now(IST).replace(tzinfo=None),
        "notes": bill_data.notes
    }
    
    bill_result = db.bills.insert_one(bill_doc)
    bill_doc["_id"] = bill_result.inserted_id
    
    # Step 4: Create payment record
    payment_doc = {
        "bill_id": bill_doc["_id"],
        "bill_number": bill_number,
        "bill_total": bill_data.bill_total,
        "payment_status": "Pending",
        "amount_paid": 0.0,
        "balance_due": bill_data.bill_total,
        "payment_mode": None,
        "payment_date": None,
        "updated_at": datetime.utcnow(),
        "updated_by": None,
        "notes": None
    }
    
    payment_result = db.payments.insert_one(payment_doc)
    payment_doc["_id"] = payment_result.inserted_id
    
    # Step 5: Reduce stock
    await reduce_stock(db, bill_data.items)
    
    return bill_doc, payment_doc

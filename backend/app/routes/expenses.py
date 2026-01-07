from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database import get_database
from pymongo.database import Database
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from bson import ObjectId

from app.models.expense import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])

# India Standard Time
IST = timezone(timedelta(hours=5, minutes=30))


def expense_helper(expense) -> dict:
    """Convert MongoDB expense document to response format"""
    return {
        "_id": str(expense["_id"]),
        "name": expense["name"],
        "expense_date": expense["expense_date"],
        "price": expense["price"],
        "quantity_gms": expense["quantity_gms"],
        "notes": expense.get("notes"),
        "created_by": expense.get("created_by"),
        "created_at": expense["created_at"],
    }


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense: ExpenseCreate,
    db: Database = Depends(get_database)
):
    """Create a new expense record for raw materials"""
    now_ist = datetime.now(IST).replace(tzinfo=None)
    
    expense_doc = {
        "name": expense.name,
        "expense_date": expense.expense_date or now_ist,
        "price": expense.price,
        "quantity_gms": expense.quantity_gms,
        "notes": expense.notes,
        "created_by": expense.created_by,
        "created_at": now_ist,
    }
    
    result = db.expenses.insert_one(expense_doc)
    expense_doc["_id"] = result.inserted_id
    
    return expense_helper(expense_doc)


@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: Database = Depends(get_database)
):
    """Get all expenses, sorted by date descending"""
    expenses = list(
        db.expenses.find()
        .sort("expense_date", -1)
        .skip(skip)
        .limit(limit)
    )
    return [expense_helper(e) for e in expenses]


@router.get("/monthly-totals")
async def get_monthly_totals(db: Database = Depends(get_database)):
    """Get expense totals for current and last month"""
    now_ist = datetime.now(IST)
    
    # Current month start
    this_month_start = now_ist.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    
    # Last month
    last_month_end = this_month_start - timedelta(seconds=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # This month expenses
    this_month_expenses = list(db.expenses.find({
        "expense_date": {"$gte": this_month_start}
    }))
    this_month_total = sum(e["price"] for e in this_month_expenses)
    
    # Last month expenses
    last_month_expenses = list(db.expenses.find({
        "expense_date": {"$gte": last_month_start, "$lt": this_month_start}
    }))
    last_month_total = sum(e["price"] for e in last_month_expenses)
    
    return {
        "this_month_expenses": this_month_total,
        "this_month_count": len(this_month_expenses),
        "last_month_expenses": last_month_total,
        "last_month_count": len(last_month_expenses),
    }


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    db: Database = Depends(get_database)
):
    """Delete an expense record"""
    try:
        obj_id = ObjectId(expense_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid expense ID format"
        )
    
    result = db.expenses.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    return None

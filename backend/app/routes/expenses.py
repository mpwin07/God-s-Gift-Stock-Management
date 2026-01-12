from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.wowsql_client import expenses as get_expenses_table
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.models.expense import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])

# India Standard Time
IST = timezone(timedelta(hours=5, minutes=30))


def expense_helper(expense: dict) -> dict:
    """Convert WowSQL expense record to response format"""
    return expense


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(expense: ExpenseCreate):
    """Create a new expense record for raw materials"""
    expenses_table = get_expenses_table()
    now_ist = datetime.now(IST).replace(tzinfo=None)
    
    expense_doc = {
        "name": expense.name,
        "expense_date": (expense.expense_date or now_ist).isoformat(),
        "price": expense.price,
        "quantity_gms": expense.quantity_gms,
        "notes": expense.notes,
        "created_by": expense.created_by,
        "created_at": now_ist.isoformat(),
    }
    
    new_expense = expenses_table.insert_one(expense_doc)
    
    return expense_helper(new_expense)


@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0)
):
    """Get all expenses, sorted by date descending"""
    expenses_table = get_expenses_table()
    
    expenses = expenses_table.find(
        order_by="expense_date",
        order_dir="desc",
        limit=limit,
        offset=skip
    )
    return [expense_helper(e) for e in expenses]


@router.get("/monthly-totals")
async def get_monthly_totals():
    """Get expense totals for current and last month"""
    expenses_table = get_expenses_table()
    now_ist = datetime.now(IST)
    
    # Current month start
    this_month_start = now_ist.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    
    # Last month
    last_month_end = this_month_start - timedelta(seconds=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all expenses
    all_expenses = expenses_table.find()
    
    # Filter for this month and last month
    this_month_expenses = []
    last_month_expenses = []
    
    for e in all_expenses:
        expense_date = e.get("expense_date")
        if isinstance(expense_date, str):
            expense_date = datetime.fromisoformat(expense_date.replace("Z", "+00:00")).replace(tzinfo=None)
        
        if expense_date >= this_month_start:
            this_month_expenses.append(e)
        elif expense_date >= last_month_start and expense_date < this_month_start:
            last_month_expenses.append(e)
    
    this_month_total = sum(e["price"] for e in this_month_expenses)
    last_month_total = sum(e["price"] for e in last_month_expenses)
    
    return {
        "this_month_expenses": this_month_total,
        "this_month_count": len(this_month_expenses),
        "last_month_expenses": last_month_total,
        "last_month_count": len(last_month_expenses),
    }


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(expense_id: int):
    """Delete an expense record"""
    expenses_table = get_expenses_table()
    
    existing = expenses_table.find_one(id=expense_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    expenses_table.delete_one(expense_id)
    
    return None

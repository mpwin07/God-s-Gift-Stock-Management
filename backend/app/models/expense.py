from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ExpenseCreate(BaseModel):
    """Create expense request for raw materials"""
    name: str = Field(..., min_length=1, max_length=100)
    expense_date: Optional[datetime] = None  # Defaults to now if not provided
    price: float = Field(..., gt=0)
    quantity_gms: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)
    created_by: Optional[str] = None


class ExpenseResponse(BaseModel):
    """Expense response model"""
    id: str = Field(..., alias="_id")
    name: str
    expense_date: datetime
    price: float
    quantity_gms: float
    notes: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    
    class Config:
        populate_by_name = True

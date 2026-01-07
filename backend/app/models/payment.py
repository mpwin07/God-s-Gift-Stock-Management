from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class PaymentStatusEnum(str, Enum):
    """Payment status types"""
    PENDING = "Pending"
    PARTIAL = "Partial"
    COMPLETED = "Completed"


class DeliveryStatusEnum(str, Enum):
    """Delivery/Preparation status types"""
    PENDING = "Pending"
    COMPLETED = "Completed"


class PaymentModeEnum(str, Enum):
    """Payment modes"""
    COD = "COD"
    GPAY = "GPay"


class PaymentUpdate(BaseModel):
    """Update payment request"""
    amount_paid: Optional[float] = Field(None, ge=0)
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None
    payment_mode: Optional[PaymentModeEnum] = None
    notes: Optional[str] = Field(None, max_length=500)
    updated_by: Optional[str] = None


class PaymentResponse(BaseModel):
    """Payment response model"""
    id: str = Field(..., alias="_id")
    bill_id: str
    bill_number: str
    bill_total: float
    payment_status: str
    delivery_status: Optional[str] = "Pending"
    amount_paid: float
    balance_due: float
    payment_mode: Optional[str]
    payment_date: Optional[datetime]
    payment_completed_date: Optional[datetime] = None  # When payment was marked complete
    updated_at: datetime
    updated_by: Optional[str]
    notes: Optional[str]
    
    class Config:
        populate_by_name = True


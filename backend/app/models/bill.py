from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum


class OrderSourceEnum(str, Enum):
    """Order source types"""
    OFFLINE = "offline"
    ONLINE = "online"


class BillItem(BaseModel):
    """Individual item in a bill"""
    product_id: str
    product_name: str
    quantity: float = Field(..., gt=0)
    unit: str
    rate: float = Field(..., gt=0)
    item_total: float = Field(..., ge=0)
    
    @field_validator('item_total')
    @classmethod
    def validate_item_total(cls, v, info):
        """Validate item_total = quantity * rate"""
        if 'quantity' in info.data and 'rate' in info.data:
            expected = round(info.data['quantity'] * info.data['rate'], 2)
            if abs(v - expected) > 0.01:
                raise ValueError('item_total must equal quantity * rate')
        return v


class BillCreate(BaseModel):
    """Create bill request"""
    batch_number: Optional[str] = Field(None, max_length=50)
    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=15)
    customer_address: Optional[str] = Field(None, max_length=200)
    items: List[BillItem] = Field(..., min_length=1)
    bill_total: float = Field(..., gt=0)
    order_source: OrderSourceEnum = OrderSourceEnum.OFFLINE
    created_by: str
    notes: Optional[str] = Field(None, max_length=500)
    bill_date: Optional[datetime] = None  # Optional: for backdating orders
    
    @field_validator('bill_total')
    @classmethod
    def validate_bill_total(cls, v, info):
        """Validate bill_total = sum of item_totals"""
        if 'items' in info.data:
            expected = round(sum(item.item_total for item in info.data['items']), 2)
            if abs(v - expected) > 0.01:
                raise ValueError('bill_total must equal sum of item totals')
        return v


class BillResponse(BaseModel):
    """Bill response model"""
    id: str = Field(..., alias="_id")
    bill_number: str
    batch_number: Optional[str]
    customer_name: str
    customer_phone: Optional[str]
    customer_address: Optional[str]
    bill_date: datetime
    items: List[BillItem]
    bill_total: float
    order_source: str
    created_by: str
    created_at: datetime
    notes: Optional[str]
    
    class Config:
        populate_by_name = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class InventoryUpdate(BaseModel):
    """Update inventory stock"""
    current_stock: float = Field(..., ge=0)
    updated_by: Optional[str] = None


class InventoryResponse(BaseModel):
    """Inventory response model"""
    id: int
    product_id: int
    product_name: Optional[str] = None  # Populated via join
    current_stock: float
    unit: str
    last_updated: datetime
    last_updated_by: Optional[str]
    min_stock_alert: Optional[int] = None  # Populated via join
    
    class Config:
        populate_by_name = True


class LowStockAlert(BaseModel):
    """Low stock alert model"""
    product_id: str
    product_name: str
    current_stock: float
    min_stock_alert: int
    unit: str

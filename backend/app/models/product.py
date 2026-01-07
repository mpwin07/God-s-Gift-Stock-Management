from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class CategoryEnum(str, Enum):
    """Product categories"""
    FOOD = "Food"
    SOAP = "Soap"


class UnitEnum(str, Enum):
    """Product units"""
    GMS = "gms"
    KG = "kg"
    PCS = "pcs"


class ProductCreate(BaseModel):
    """Create product request"""
    name: str = Field(..., min_length=1, max_length=100)
    category: CategoryEnum
    unit: UnitEnum
    rate: Optional[float] = Field(None, ge=0)
    base_weight: int = Field(250, ge=1)  # Default 250g, price is for this weight
    min_stock_alert: int = Field(10, ge=0)


class ProductUpdate(BaseModel):
    """Update product request"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[CategoryEnum] = None
    unit: Optional[UnitEnum] = None
    rate: Optional[float] = Field(None, ge=0)
    base_weight: Optional[int] = Field(None, ge=1)
    min_stock_alert: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    """Product response model"""
    id: str = Field(..., alias="_id")
    name: str
    category: str
    unit: str
    rate: Optional[float]
    base_weight: int = 250  # Default for existing products
    min_stock_alert: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        populate_by_name = True


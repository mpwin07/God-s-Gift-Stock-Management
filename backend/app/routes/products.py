from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.wowsql_client import products as get_products_table
from app.models.product import ProductCreate, ProductUpdate, ProductResponse
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/products", tags=["Products"])


def product_helper(product: dict) -> dict:
    """Convert WowSQL record to response format"""
    # WowSQL uses 'id' directly, no conversion needed
    return product


@router.get("", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: bool = Query(True, description="Filter by active status")
):
    """Get all products with optional filters"""
    products_table = get_products_table()
    
    filters = {"is_active": is_active}
    if category:
        filters["category"] = category
    
    products = products_table.find(filters=filters, order_by="name", order_dir="asc")
    return [product_helper(p) for p in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate):
    """Create a new product"""
    products_table = get_products_table()
    
    # Check if product name already exists
    existing = products_table.find_one(filters={"name": product.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with name '{product.name}' already exists"
        )
    
    # Prepare product data
    product_data = {
        "name": product.name,
        "category": product.category.value,
        "unit": product.unit.value,
        "rate": product.rate,
        "base_weight": product.base_weight,
        "min_stock_alert": product.min_stock_alert,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Insert product
    new_product = products_table.insert_one(product_data)
    
    return product_helper(new_product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    """Get product by ID"""
    products_table = get_products_table()
    
    product = products_table.find_one(id=product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product_helper(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate
):
    """Update product"""
    products_table = get_products_table()
    
    # Check if product exists
    existing = products_table.find_one(id=product_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Prepare update data
    update_data = {}
    for field, value in product_update.model_dump(exclude_unset=True).items():
        if hasattr(value, 'value'):  # Handle enums
            update_data[field] = value.value
        else:
            update_data[field] = value
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    # Update product
    updated_product = products_table.update_one(product_id, update_data)
    
    return product_helper(updated_product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int):
    """Soft delete product (set is_active to False)"""
    products_table = get_products_table()
    
    existing = products_table.find_one(id=product_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    products_table.update_one(product_id, {
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat()
    })
    
    return None


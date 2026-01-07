from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database import get_database
from app.models.product import ProductCreate, ProductUpdate, ProductResponse
from pymongo.database import Database
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/products", tags=["Products"])


def product_helper(product: dict) -> dict:
    """Convert MongoDB document to response format"""
    product["_id"] = str(product["_id"])
    return product


@router.get("", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Database = Depends(get_database)
):
    """Get all products with optional filters"""
    query = {"is_active": is_active}
    
    if category:
        query["category"] = category
    
    products = list(db.products.find(query).sort("name", 1))
    return [product_helper(p) for p in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate, db: Database = Depends(get_database)):
    """Create a new product"""
    # Check if product name already exists
    existing = db.products.find_one({"name": product.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with name '{product.name}' already exists"
        )
    
    product_doc = {
        **product.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    
    # Create inventory record for this product
    inventory_doc = {
        "product_id": result.inserted_id,
        "current_stock": 0.0,
        "unit": product.unit.value,
        "last_updated": datetime.utcnow(),
        "last_updated_by": None
    }
    db.inventory.insert_one(inventory_doc)
    
    return product_helper(product_doc)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: Database = Depends(get_database)):
    """Get product by ID"""
    try:
        product = db.products.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product_helper(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    db: Database = Depends(get_database)
):
    """Update product"""
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    
    # Check if product exists
    existing = db.products.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Prepare update data
    update_data = {k: v for k, v in product_update.model_dump(exclude_unset=True).items()}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update product
    db.products.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )
    
    # If unit changed, update inventory
    if "unit" in update_data:
        db.inventory.update_one(
            {"product_id": obj_id},
            {"$set": {"unit": update_data["unit"].value if hasattr(update_data["unit"], "value") else update_data["unit"]}}
        )
    
    # Get updated product
    updated_product = db.products.find_one({"_id": obj_id})
    return product_helper(updated_product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, db: Database = Depends(get_database)):
    """Soft delete product (set is_active to False)"""
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    
    result = db.products.update_one(
        {"_id": obj_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return None

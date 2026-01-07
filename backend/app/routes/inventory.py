from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.models.inventory import InventoryUpdate, InventoryResponse, LowStockAlert
from pymongo.database import Database
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def inventory_helper(inventory: dict, product: dict = None) -> dict:
    """Convert MongoDB document to response format"""
    inventory["_id"] = str(inventory["_id"])
    inventory["product_id"] = str(inventory["product_id"])
    
    if product:
        inventory["product_name"] = product.get("name")
        inventory["min_stock_alert"] = product.get("min_stock_alert")
    
    return inventory


@router.get("", response_model=List[InventoryResponse])
async def get_all_inventory(db: Database = Depends(get_database)):
    """Get all inventory with product details"""
    inventory_items = list(db.inventory.find())
    
    result = []
    for inv in inventory_items:
        product = db.products.find_one({"_id": inv["product_id"]})
        result.append(inventory_helper(inv, product))
    
    return result


@router.get("/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(db: Database = Depends(get_database)):
    """Get products with stock below minimum threshold"""
    # Aggregate inventory with products
    pipeline = [
        {
            "$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product"
            }
        },
        {"$unwind": "$product"},
        {
            "$match": {
                "$expr": {"$lt": ["$current_stock", "$product.min_stock_alert"]},
                "product.is_active": True
            }
        },
        {
            "$project": {
                "product_id": {"$toString": "$product_id"},
                "product_name": "$product.name",
                "current_stock": 1,
                "min_stock_alert": "$product.min_stock_alert",
                "unit": 1
            }
        }
    ]
    
    alerts = list(db.inventory.aggregate(pipeline))
    return alerts


@router.get("/{product_id}", response_model=InventoryResponse)
async def get_inventory_by_product(product_id: str, db: Database = Depends(get_database)):
    """Get inventory for specific product"""
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    
    inventory = db.inventory.find_one({"product_id": obj_id})
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product"
        )
    
    product = db.products.find_one({"_id": obj_id})
    return inventory_helper(inventory, product)


@router.put("/{product_id}", response_model=InventoryResponse)
async def update_inventory(
    product_id: str,
    inventory_update: InventoryUpdate,
    db: Database = Depends(get_database)
):
    """Manually update inventory stock"""
    try:
        obj_id = ObjectId(product_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    
    # Check if inventory exists
    existing = db.inventory.find_one({"product_id": obj_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product"
        )
    
    # Update inventory
    update_data = {
        "current_stock": inventory_update.current_stock,
        "last_updated": datetime.utcnow(),
        "last_updated_by": inventory_update.updated_by
    }
    
    db.inventory.update_one(
        {"product_id": obj_id},
        {"$set": update_data}
    )
    
    # Get updated inventory
    updated_inventory = db.inventory.find_one({"product_id": obj_id})
    product = db.products.find_one({"_id": obj_id})
    
    return inventory_helper(updated_inventory, product)

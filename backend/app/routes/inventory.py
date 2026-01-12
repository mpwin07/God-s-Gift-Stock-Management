from fastapi import APIRouter, Depends, HTTPException, status
from app.wowsql_client import inventory as get_inventory_table, products as get_products_table
from app.models.inventory import InventoryUpdate, InventoryResponse, LowStockAlert
from datetime import datetime
from typing import List

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def inventory_helper(inventory: dict, product: dict = None) -> dict:
    """Convert WowSQL record to response format"""
    if product:
        inventory["product_name"] = product.get("name")
        inventory["min_stock_alert"] = product.get("min_stock_alert")
    
    return inventory


@router.get("", response_model=List[InventoryResponse])
async def get_all_inventory():
    """Get all inventory with product details"""
    inventory_table = get_inventory_table()
    products_table = get_products_table()
    
    inventory_items = inventory_table.find()
    
    result = []
    for inv in inventory_items:
        product = products_table.find_one(id=inv["product_id"])
        result.append(inventory_helper(inv, product))
    
    return result


@router.get("/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts():
    """Get products with stock below minimum threshold"""
    inventory_table = get_inventory_table()
    products_table = get_products_table()
    
    # Get all inventory and products, then filter
    inventory_items = inventory_table.find()
    
    alerts = []
    for inv in inventory_items:
        product = products_table.find_one(id=inv["product_id"])
        if product and product.get("is_active", True):
            if inv["current_stock"] < product.get("min_stock_alert", 10):
                alerts.append({
                    "product_id": str(inv["product_id"]),
                    "product_name": product["name"],
                    "current_stock": inv["current_stock"],
                    "min_stock_alert": product["min_stock_alert"],
                    "unit": inv["unit"]
                })
    
    return alerts


@router.get("/{product_id}", response_model=InventoryResponse)
async def get_inventory_by_product(product_id: int):
    """Get inventory for specific product"""
    inventory_table = get_inventory_table()
    products_table = get_products_table()
    
    inventory = inventory_table.find_one(filters={"product_id": product_id})
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product"
        )
    
    product = products_table.find_one(id=product_id)
    return inventory_helper(inventory, product)


@router.put("/{product_id}", response_model=InventoryResponse)
async def update_inventory(
    product_id: int,
    inventory_update: InventoryUpdate
):
    """Manually update inventory stock"""
    inventory_table = get_inventory_table()
    products_table = get_products_table()
    
    # Check if inventory exists
    existing = inventory_table.find_one(filters={"product_id": product_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product"
        )
    
    # Update inventory
    update_data = {
        "current_stock": inventory_update.current_stock,
        "last_updated": datetime.utcnow().isoformat(),
        "last_updated_by": inventory_update.updated_by
    }
    
    updated_inventory = inventory_table.update_one(existing["id"], update_data)
    
    product = products_table.find_one(id=product_id)
    
    return inventory_helper(updated_inventory, product)

from fastapi import APIRouter, Depends
from app.wowsql_client import bills as get_bills_table, payments as get_payments_table, inventory as get_inventory_table, products as get_products_table
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from pydantic import BaseModel
import json

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# India Standard Time (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


class DashboardStats(BaseModel):
    """Dashboard statistics model"""
    today_sales: float
    today_bills_count: int
    total_pending_payments: int
    total_pending_amount: float
    low_stock_count: int


class ProductSales(BaseModel):
    """Product-wise sales model"""
    product_name: str
    total_quantity: float
    total_sales: float
    unit: str


class DailySales(BaseModel):
    """Daily sales model"""
    date: str
    sales: float


class AnalyticsResponse(BaseModel):
    """Analytics response model"""
    product_sales: List[ProductSales]
    daily_sales: List[DailySales]
    period: str


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """
    Get dashboard statistics:
    - Today's sales total
    - Today's bills count
    - Pending payments count
    - Total pending amount
    - Low stock alerts count
    """
    bills_table = get_bills_table()
    payments_table = get_payments_table()
    inventory_table = get_inventory_table()
    products_table = get_products_table()
    
    # Use IST for "today" calculation
    now_ist = datetime.now(IST)
    today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    today_end = today_start + timedelta(days=1)
    
    # Get all bills and filter for today
    all_bills = bills_table.find()
    today_bills = []
    for bill in all_bills:
        bill_date = bill.get("bill_date")
        if isinstance(bill_date, str):
            bill_date = datetime.fromisoformat(bill_date.replace("Z", "+00:00")).replace(tzinfo=None)
        if bill_date >= today_start and bill_date < today_end:
            today_bills.append(bill)
    
    today_bills_count = len(today_bills)
    
    # Get payments completed today
    all_payments = payments_table.find()
    today_sales = 0
    for payment in all_payments:
        completed_date = payment.get("payment_completed_date")
        if completed_date and payment.get("payment_status") == "Completed":
            if isinstance(completed_date, str):
                completed_date = datetime.fromisoformat(completed_date.replace("Z", "+00:00")).replace(tzinfo=None)
            if completed_date >= today_start and completed_date < today_end:
                today_sales += payment.get("bill_total", 0)
    
    # Pending payments
    pending_payments = [p for p in all_payments if p.get("payment_status") in ["Pending", "Partial"]]
    total_pending_payments = len(pending_payments)
    total_pending_amount = sum(p.get("balance_due", 0) for p in pending_payments)
    
    # Low stock count
    all_inventory = inventory_table.find()
    all_products = products_table.find()
    products_map = {p["id"]: p for p in all_products}
    
    low_stock_count = 0
    for inv in all_inventory:
        product = products_map.get(inv["product_id"])
        if product and product.get("is_active", True):
            if inv["current_stock"] < product.get("min_stock_alert", 10):
                low_stock_count += 1
    
    return DashboardStats(
        today_sales=round(today_sales, 2),
        today_bills_count=today_bills_count,
        total_pending_payments=total_pending_payments,
        total_pending_amount=round(total_pending_amount, 2),
        low_stock_count=low_stock_count
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(days: int = 30):
    """
    Get analytics:
    - Product-wise sales
    - Daily sales trend
    """
    bills_table = get_bills_table()
    payments_table = get_payments_table()
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all bills in period
    all_bills = bills_table.find()
    period_bills = []
    for bill in all_bills:
        bill_date = bill.get("bill_date")
        if isinstance(bill_date, str):
            bill_date = datetime.fromisoformat(bill_date.replace("Z", "+00:00")).replace(tzinfo=None)
        if bill_date >= start_date:
            period_bills.append(bill)
    
    # Product sales aggregation
    product_sales_map = {}
    for bill in period_bills:
        items = bill.get("items", [])
        if isinstance(items, str):
            items = json.loads(items)
        
        for item in items:
            name = item.get("product_name", "Unknown")
            if name not in product_sales_map:
                product_sales_map[name] = {
                    "total_quantity": 0,
                    "total_sales": 0,
                    "unit": item.get("unit", "pcs")
                }
            product_sales_map[name]["total_quantity"] += item.get("quantity", 0)
            product_sales_map[name]["total_sales"] += item.get("item_total", 0)
    
    product_sales = [
        ProductSales(
            product_name=name,
            total_quantity=round(data["total_quantity"], 2),
            total_sales=round(data["total_sales"], 2),
            unit=data["unit"]
        )
        for name, data in sorted(product_sales_map.items(), key=lambda x: -x[1]["total_sales"])
    ]
    
    # Daily sales aggregation based on payment completion date
    all_payments = payments_table.find()
    daily_sales_map = {}
    
    for payment in all_payments:
        if payment.get("payment_status") != "Completed":
            continue
        
        completed_date = payment.get("payment_completed_date")
        if not completed_date:
            continue
        
        if isinstance(completed_date, str):
            completed_date = datetime.fromisoformat(completed_date.replace("Z", "+00:00")).replace(tzinfo=None)
        
        if completed_date >= start_date:
            date_str = completed_date.strftime("%Y-%m-%d")
            if date_str not in daily_sales_map:
                daily_sales_map[date_str] = 0
            daily_sales_map[date_str] += payment.get("bill_total", 0)
    
    # Fill in missing dates
    daily_sales = []
    for i in range(days):
        date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_sales.append(DailySales(
            date=date_str,
            sales=round(daily_sales_map.get(date_str, 0), 2)
        ))
    
    return AnalyticsResponse(
        product_sales=product_sales,
        daily_sales=daily_sales,
        period=f"Last {days} days"
    )

from fastapi import APIRouter, Depends
from app.database import get_database
from pymongo.database import Database
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from pydantic import BaseModel

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
async def get_dashboard_stats(db: Database = Depends(get_database)):
    """
    Get dashboard statistics:
    - Today's sales total
    - Today's bills count
    - Pending payments count
    - Total pending amount
    - Low stock alerts count
    """
    # Use IST for "today" calculation
    # Bills are stored with IST timestamps (no timezone info)
    now_ist = datetime.now(IST)
    today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    today_end = today_start + timedelta(days=1)
    
    # Get today's bills (for count display)
    today_bills = list(db.bills.find({
        "bill_date": {"$gte": today_start, "$lt": today_end}
    }))
    
    today_bills_count = len(today_bills)
    
    # Today's sales = payments completed TODAY (not based on bill_date)
    # This counts sales on the day payment was confirmed
    today_completed_payments = list(db.payments.find({
        "payment_completed_date": {"$gte": today_start, "$lt": today_end},
        "payment_status": "Completed"
    }))
    
    # Get the bill totals for these completed payments
    today_paid_bill_ids = [p["bill_id"] for p in today_completed_payments]
    today_paid_bills = list(db.bills.find({"_id": {"$in": today_paid_bill_ids}}))
    
    today_sales = sum(bill["bill_total"] for bill in today_paid_bills)
    
    # Pending payments
    pending_payments = list(db.payments.find({
        "payment_status": {"$in": ["Pending", "Partial"]}
    }))
    
    total_pending_payments = len(pending_payments)
    total_pending_amount = sum(p["balance_due"] for p in pending_payments)
    
    # Low stock count
    low_stock_pipeline = [
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
        {"$count": "low_stock_count"}
    ]
    
    low_stock_result = list(db.inventory.aggregate(low_stock_pipeline))
    low_stock_count = low_stock_result[0]["low_stock_count"] if low_stock_result else 0
    
    return DashboardStats(
        today_sales=round(today_sales, 2),
        today_bills_count=today_bills_count,
        total_pending_payments=total_pending_payments,
        total_pending_amount=round(total_pending_amount, 2),
        low_stock_count=low_stock_count
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = 30,
    db: Database = Depends(get_database)
):
    """
    Get analytics:
    - Product-wise sales
    - Daily sales trend
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 1. Product Sales Aggregation
    product_pipeline = [
        {
            "$match": {
                "bill_date": {"$gte": start_date}
            }
        },
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.product_name",
                "total_quantity": {"$sum": "$items.quantity"},
                "total_sales": {"$sum": "$items.item_total"},
                "unit": {"$first": "$items.unit"}
            }
        },
        {"$sort": {"total_sales": -1}}
    ]
    
    product_results = list(db.bills.aggregate(product_pipeline))
    
    product_sales = [
        ProductSales(
            product_name=r["_id"],
            total_quantity=round(r["total_quantity"], 2),
            total_sales=round(r["total_sales"], 2),
            unit=r["unit"]
        )
        for r in product_results
    ]
    
    # 2. Daily Sales Aggregation - based on payment completion date
    # Join payments with bills to get bill_total, group by payment_completed_date
    daily_pipeline = [
        {
            "$match": {
                "payment_completed_date": {"$gte": start_date},
                "payment_status": "Completed"
            }
        },
        {
            "$lookup": {
                "from": "bills",
                "localField": "bill_id",
                "foreignField": "_id",
                "as": "bill"
            }
        },
        {"$unwind": "$bill"},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$payment_completed_date"}
                },
                "total_sales": {"$sum": "$bill.bill_total"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_results = list(db.payments.aggregate(daily_pipeline))
    
    # Fill in missing dates with 0
    daily_sales = []
    current_date = start_date
    sales_map = {r["_id"]: r["total_sales"] for r in daily_results}
    
    for i in range(days):
        date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_sales.append(DailySales(
            date=date_str,
            sales=round(sales_map.get(date_str, 0), 2)
        ))
    
    return AnalyticsResponse(
        product_sales=product_sales,
        daily_sales=daily_sales,
        period=f"Last {days} days"
    )

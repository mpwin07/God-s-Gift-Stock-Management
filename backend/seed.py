"""
Seed script to populate the WowSQL database with initial products
Run this script once to add all products to the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.wowsql_client import products as get_products_table, inventory as get_inventory_table
from app.config import get_settings
from datetime import datetime

settings = get_settings()

# Default rates for products
PRODUCT_RATES = {
    "ABC Supersip": 50.00,
    "Red Banana Supersip": 50.00,
    "Kavuni Arisi Drink": 50.00,
    "Amla Candy": 200.00,
    "Neem Soap": 90.00,
    "Kuppameni Soap": 90.00,
    "Charcoal Soap": 90.00,
    "Carrot Soap": 90.00,
    "Beetroot Soap": 90.00,
    "Turmeric Soap": 90.00,
    "Nalangumavu Soap": 90.00,
    "Aloe Vera Soap": 90.00,
    "Paneer Rose Soap": 90.00,
    "Rosemary Soap": 110.00,
    "Customized Soap": 110.00,
}


def seed_products():
    """Seed products into WowSQL database"""
    products_table = get_products_table()
    inventory_table = get_inventory_table()
    
    products = [
        # Food Products
        {"name": "ABC Supersip", "category": "Food", "unit": "pcs"},
        {"name": "Red Banana Supersip", "category": "Food", "unit": "pcs"},
        {"name": "Kavuni Arisi Drink", "category": "Food", "unit": "pcs"},
        {"name": "Amla Candy", "category": "Food", "unit": "gms"},
        
        # Soap Products
        {"name": "Neem Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Kuppameni Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Charcoal Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Carrot Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Beetroot Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Turmeric Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Nalangumavu Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Aloe Vera Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Paneer Rose Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Rosemary Soap", "category": "Soap", "unit": "pcs"},
        {"name": "Customized Soap", "category": "Soap", "unit": "pcs"},
    ]
    
    inserted_count = 0
    skipped_count = 0
    
    for product_data in products:
        # Check if product already exists
        existing = products_table.find_one(filters={"name": product_data["name"]})
        
        if existing:
            print(f"⏭️  Skipped: {product_data['name']} (already exists)")
            skipped_count += 1
            continue
        
        # Create product document with rate
        product_doc = {
            "name": product_data["name"],
            "category": product_data["category"],
            "unit": product_data["unit"],
            "rate": PRODUCT_RATES.get(product_data["name"]),
            "base_weight": 250,
            "min_stock_alert": 10,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insert product
        new_product = products_table.insert_one(product_doc)
        product_id = new_product["id"]
        
        # Create inventory record
        inventory_doc = {
            "product_id": product_id,
            "current_stock": 0.0,
            "unit": product_data["unit"],
            "last_updated": datetime.utcnow().isoformat(),
            "last_updated_by": None
        }
        inventory_table.insert_one(inventory_doc)
        
        print(f"✅ Added: {product_data['name']} ({product_data['category']}) - Rate: ₹{PRODUCT_RATES.get(product_data['name'], 'N/A')}")
        inserted_count += 1
    
    print("\n" + "="*60)
    print(f"✨ Seeding completed!")
    print(f"   Inserted: {inserted_count} products")
    print(f"   Skipped:  {skipped_count} products")
    print("="*60)


if __name__ == "__main__":
    print("🌱 Starting seed process for God's Gift Bath Soap...")
    print(f"📦 Database: WowSQL at {settings.WOWSQL_BASE_URL}")
    print("="*60 + "\n")
    
    try:
        seed_products()
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

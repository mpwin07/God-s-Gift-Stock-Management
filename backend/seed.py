"""
Seed script to populate the database with initial products
Run this script once to add all products to the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_database
from app.config import get_settings
from datetime import datetime

settings = get_settings()


def seed_products():
    """Seed products into database"""
    db = get_database()
    
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
        existing = db.products.find_one({"name": product_data["name"]})
        
        if existing:
            print(f"⏭️  Skipped: {product_data['name']} (already exists)")
            skipped_count += 1
            continue
        
        # Create product document
        product_doc = {
            **product_data,
            "rate": None,  # Rate to be set manually by admin
            "min_stock_alert": 10,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True
        }
        
        # Insert product
        result = db.products.insert_one(product_doc)
        product_id = result.inserted_id
        
        # Create inventory record
        inventory_doc = {
            "product_id": product_id,
            "current_stock": 0.0,
            "unit": product_data["unit"],
            "last_updated": datetime.utcnow(),
            "last_updated_by": None
        }
        db.inventory.insert_one(inventory_doc)
        
        print(f"✅ Added: {product_data['name']} ({product_data['category']})")
        inserted_count += 1
    
    print("\n" + "="*60)
    print(f"✨ Seeding completed!")
    print(f"   Inserted: {inserted_count} products")
    print(f"   Skipped:  {skipped_count} products")
    print("="*60)
    
    # Create indexes
    print("\n📊 Creating database indexes...")
    db.products.create_index("name", unique=True)
    db.products.create_index("category")
    db.users.create_index("username", unique=True)
    db.inventory.create_index("product_id", unique=True)
    db.bills.create_index("bill_number", unique=True)
    db.bills.create_index("bill_date")
    db.payments.create_index("bill_id", unique=True)
    db.payments.create_index("payment_status")
    print("✅ Indexes created successfully!")


if __name__ == "__main__":
    print("🌱 Starting seed process for God's Gift Bath Soap...")
    print(f"📦 Database: {settings.MONGODB_URI.split('@')[1].split('/')[0] if '@' in settings.MONGODB_URI else 'local'}")
    print("="*60 + "\n")
    
    try:
        seed_products()
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        sys.exit(1)

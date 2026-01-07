"""
Add initial stock to all products for testing
"""
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

print("📦 Adding stock to products...")

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_database()

# Get all inventory records
inventory_items = list(db.inventory.find())

updated_count = 0
for inv in inventory_items:
    # Set initial stock to 1000 units for testing
    result = db.inventory.update_one(
        {"_id": inv["_id"]},
        {
            "$set": {
                "current_stock": 1000.0,
                "last_updated": datetime.utcnow()
            }
        }
    )
    if result.modified_count > 0:
        product = db.products.find_one({"_id": inv["product_id"]})
        product_name = product["name"] if product else "Unknown"
        print(f"✅ Added stock: {product_name} → 1000 units")
        updated_count += 1

client.close()

print(f"\n🎉 Done! Updated stock for {updated_count} products.")
print("You can now create bills in the app!")

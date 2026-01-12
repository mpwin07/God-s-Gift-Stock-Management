"""
Quick script to add default rates to all products
This allows you to test the billing feature immediately
"""
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

# Default rates for products (in Rupees)
DEFAULT_RATES = {
    "ABC Supersip": 300.00,
    "Red Banana Supersip": 249.00,
    "Kavuni Arisi Drink": 200.00,
    "Amla Candy": 80.00,
    "Neem Soap": 80.00,
    "Kuppameni Soap": 120.00,
    "Charcoal Soap": 120.00,
    "Carrot Soap": 110.00,
    "Beetroot Soap": 110.00,
    "Turmeric Soap": 90.00,
    "Nalangumavu Soap": 110.00,
    "Aloe Vera Soap": 90.00,
    "Paneer Rose Soap": 90.00,
    "Rosemary Soap": 110.00,
    "Customized Soap": 110.00,
}

print("💰 Adding default rates to products...")

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_database()

updated_count = 0

for product_name, rate in DEFAULT_RATES.items():
    result = db.products.update_one(
        {"name": product_name},
        {"$set": {"rate": rate}}
    )
    if result.modified_count > 0:
        print(f"✅ Updated: {product_name} → ₹{rate}")
        updated_count += 1
    else:
        print(f"⏭️  Skipped: {product_name} (already has rate or not found)")

client.close()

print(f"\n🎉 Done! Updated {updated_count} products with default rates.")
print("You can now create bills in the app!")

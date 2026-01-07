"""
Script to clear all test bills from the database while keeping products intact.
Run this from the backend directory: python clear_bills.py
"""

from pymongo import MongoClient
from app.config import get_settings

def clear_test_bills():
    """Delete all bills and payments from the database, keeping products intact."""
    settings = get_settings()
    client = MongoClient(settings.MONGODB_URI)
    db = client.get_database()
    
    # Count before deletion
    bills_count = db.bills.count_documents({})
    payments_count = db.payments.count_documents({})
    
    print(f"Found {bills_count} bills and {payments_count} payments")
    
    # Confirm before deletion
    confirm = input("Are you sure you want to delete all bills and payments? (yes/no): ")
    
    if confirm.lower() == "yes":
        # Delete all bills
        result_bills = db.bills.delete_many({})
        print(f"Deleted {result_bills.deleted_count} bills")
        
        # Delete all payments
        result_payments = db.payments.delete_many({})
        print(f"Deleted {result_payments.deleted_count} payments")
        
        # Verify products are intact
        products_count = db.products.count_documents({})
        print(f"Products remaining: {products_count} (unchanged)")
        
        print("\n✅ Test data cleared successfully!")
    else:
        print("Operation cancelled.")
    
    client.close()

if __name__ == "__main__":
    clear_test_bills()

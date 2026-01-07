"""
Create admin user using bcrypt directly
"""
from pymongo import MongoClient
import bcrypt
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Get configuration
MONGODB_URI = os.getenv("MONGODB_URI")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "godsgiftadmin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "godsgift1234")
ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "Shobana Mahesh")

print(f"🔐 Creating admin user...")
print(f"   Username: {ADMIN_USERNAME}")
print(f"   Password length: {len(ADMIN_PASSWORD)} characters")

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_database()

# Check if admin exists
existing = db.users.find_one({"username": ADMIN_USERNAME})

if existing:
    print(f"\n✅ Admin user '{ADMIN_USERNAME}' already exists!")
    print(f"   You can login with the credentials above.")
else:
    # Hash password using bcrypt directly
    password_bytes = ADMIN_PASSWORD.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    # Create user document
    user_doc = {
        "username": ADMIN_USERNAME,
        "password_hash": password_hash,
        "full_name": ADMIN_FULL_NAME,
        "role": "admin",
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    # Insert user
    result = db.users.insert_one(user_doc)
    print(f"\n✅ Admin user '{ADMIN_USERNAME}' created successfully!")
    print(f"   ID: {result.inserted_id}")
    print(f"   Password hash: {password_hash[:50]}...")

client.close()
print(f"\n🎉 Setup complete! You can now login with:")
print(f"   Username: {ADMIN_USERNAME}")
print(f"   Password: {ADMIN_PASSWORD}")

"""
God's Gift App - Feature Test Script
Tests all backend API endpoints and reports results
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test credentials
TEST_USER = "godsgiftadmin"
TEST_PASS = "godsgift1234"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_result(name, success, message=""):
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if success else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"  {status} {name}")
    if message and not success:
        print(f"        {Colors.YELLOW}{message}{Colors.END}")

def print_section(name):
    print(f"\n{Colors.BLUE}{'='*50}{Colors.END}")
    print(f"{Colors.BLUE}  {name}{Colors.END}")
    print(f"{Colors.BLUE}{'='*50}{Colors.END}")

token = None
results = {"passed": 0, "failed": 0}

def test(name, condition, message=""):
    global results
    if condition:
        results["passed"] += 1
    else:
        results["failed"] += 1
    print_result(name, condition, message)
    return condition

# ============================================
# AUTH TESTS
# ============================================
print_section("AUTHENTICATION")

try:
    # Login - using JSON body
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": TEST_USER,
        "password": TEST_PASS
    })
    success = response.status_code == 200
    if success:
        token = response.json().get("access_token")
    test("Login with valid credentials", success, response.text if not success else "")
    
    # Invalid login - should fail (not 200)
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "wronguser_xyz",
        "password": "wrongpass_xyz"
    })
    # Accept either 401 (Unauthorized) or 400 (Bad Request) as valid rejection
    test("Reject invalid credentials", response.status_code in [400, 401, 422], 
         f"Got status {response.status_code}")
    
except Exception as e:
    test("Auth endpoint available", False, str(e))

headers = {"Authorization": f"Bearer {token}"} if token else {}

# ============================================
# PRODUCTS TESTS
# ============================================
print_section("PRODUCTS")

try:
    # Get products
    response = requests.get(f"{BASE_URL}/products", headers=headers)
    test("Get all products", response.status_code == 200)
    products = response.json() if response.status_code == 200 else []
    test("Products is a list", isinstance(products, list))
    
    if products:
        product_id = products[0].get("_id")
        test("Product has _id field", product_id is not None)
        test("Product has name field", "name" in products[0])
        test("Product has category field", "category" in products[0])
        
except Exception as e:
    test("Products endpoint available", False, str(e))

# ============================================
# BILLS TESTS
# ============================================
print_section("BILLS")

try:
    # Get bills
    response = requests.get(f"{BASE_URL}/bills", headers=headers)
    test("Get all bills", response.status_code == 200)
    bills = response.json() if response.status_code == 200 else []
    test("Bills is a list", isinstance(bills, list))
    
    if bills:
        bill = bills[0]
        test("Bill has bill_number", "bill_number" in bill)
        test("Bill has customer_name", "customer_name" in bill)
        test("Bill has bill_total", "bill_total" in bill)
        test("Bill has items", "items" in bill)
        
        # Get specific bill
        bill_id = bill.get("_id")
        if bill_id:
            response = requests.get(f"{BASE_URL}/bills/{bill_id}", headers=headers)
            test("Get bill by ID", response.status_code == 200)
            
except Exception as e:
    test("Bills endpoint available", False, str(e))

# ============================================
# DASHBOARD TESTS
# ============================================
print_section("DASHBOARD")

try:
    # Get stats
    response = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    test("Get dashboard stats", response.status_code == 200)
    
    if response.status_code == 200:
        stats = response.json()
        test("Stats has today_sales", "today_sales" in stats)
        test("Stats has today_bills_count", "today_bills_count" in stats)
        test("Stats has low_stock_count", "low_stock_count" in stats)
    
    # Get analytics
    response = requests.get(f"{BASE_URL}/dashboard/analytics?days=30", headers=headers)
    test("Get dashboard analytics", response.status_code == 200)
    
    if response.status_code == 200:
        analytics = response.json()
        test("Analytics has product_sales", "product_sales" in analytics)
        
except Exception as e:
    test("Dashboard endpoint available", False, str(e))

# ============================================
# INVENTORY TESTS
# ============================================
print_section("INVENTORY")

try:
    # Get inventory
    response = requests.get(f"{BASE_URL}/inventory", headers=headers)
    test("Get all inventory", response.status_code == 200)
    inventory = response.json() if response.status_code == 200 else []
    test("Inventory is a list", isinstance(inventory, list))
    
    # Get low stock alerts
    response = requests.get(f"{BASE_URL}/inventory/low-stock", headers=headers)
    test("Get low stock alerts", response.status_code == 200)
    
except Exception as e:
    test("Inventory endpoint available", False, str(e))

# ============================================
# PAYMENTS TESTS
# ============================================
print_section("PAYMENTS")

try:
    # Get payments
    response = requests.get(f"{BASE_URL}/payments", headers=headers)
    test("Get all payments", response.status_code == 200)
    payments = response.json() if response.status_code == 200 else []
    test("Payments is a list", isinstance(payments, list))
    
    if payments:
        payment = payments[0]
        test("Payment has payment_status", "payment_status" in payment)
        
except Exception as e:
    test("Payments endpoint available", False, str(e))

# ============================================
# CREATE BILL TEST
# ============================================
print_section("CREATE BILL (Integration)")

try:
    if products:
        # Create a test bill
        test_bill = {
            "customer_name": "Test Customer",
            "customer_phone": "1234567890",
            "items": [
                {
                    "product_id": products[0]["_id"],
                    "product_name": products[0]["name"],
                    "quantity": 1,
                    "unit": products[0].get("unit", "piece"),
                    "rate": 100,
                    "item_total": 100
                }
            ],
            "bill_total": 100,
            "order_source": "offline",
            "created_by": TEST_USER
        }
        
        response = requests.post(f"{BASE_URL}/bills", headers=headers, json=test_bill)
        # Accept 200 or 201 for create
        create_success = response.status_code in [200, 201]
        test("Create new bill", create_success, 
             f"Status: {response.status_code}, Error: {response.text[:200] if not create_success else ''}")
        
        if create_success:
            new_bill = response.json()
            test("New bill has bill_number", "bill_number" in new_bill)
            test("New bill has correct customer", new_bill.get("customer_name") == "Test Customer")
        else:
            # Skip dependent tests
            test("New bill has bill_number (skipped)", False, "Bill creation failed")
            test("New bill has correct customer (skipped)", False, "Bill creation failed")
    else:
        test("Create bill (skipped - no products)", False, "No products available")
        
except Exception as e:
    test("Create bill flow", False, str(e))

# ============================================
# SUMMARY
# ============================================
print_section("TEST SUMMARY")
total = results["passed"] + results["failed"]
pass_rate = (results["passed"] / total * 100) if total > 0 else 0

print(f"\n  Total Tests: {total}")
print(f"  {Colors.GREEN}Passed: {results['passed']}{Colors.END}")
print(f"  {Colors.RED}Failed: {results['failed']}{Colors.END}")
print(f"\n  Pass Rate: {pass_rate:.1f}%")

if results["failed"] == 0:
    print(f"\n  {Colors.GREEN}🎉 All tests passed!{Colors.END}\n")
else:
    print(f"\n  {Colors.YELLOW}⚠️  Some tests failed. Check above for details.{Colors.END}\n")

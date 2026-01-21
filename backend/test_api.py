"""
API Test Script - Tests all endpoints to ensure they're working
Run: python test_api.py [local|prod]
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
LOCAL_URL = "http://localhost:8000"
PROD_URL = "https://god-s-gift-stock-management-8bz6.onrender.com"

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Colors.RESET}\n")

def print_result(endpoint, method, status, message, time_ms):
    if status == "PASS":
        color = Colors.GREEN
        icon = "✅"
    elif status == "WARN":
        color = Colors.YELLOW
        icon = "⚠️"
    else:
        color = Colors.RED
        icon = "❌"
    
    print(f"{icon} {color}[{status}]{Colors.RESET} {method:6} {endpoint:40} ({time_ms:>6.0f}ms) - {message}")

def test_endpoint(base_url, method, endpoint, data=None, expected_status=200, description=""):
    """Test a single endpoint"""
    url = f"{base_url}{endpoint}"
    start_time = datetime.now()
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, timeout=30)
        else:
            return False, "Unknown method", 0
        
        time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Handle redirects (307)
        if response.status_code == 307:
            # Follow redirect
            redirect_url = response.headers.get('Location', url + '/')
            if method == "GET":
                response = requests.get(redirect_url, timeout=30)
            time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        if response.status_code == expected_status:
            # Check if response is valid JSON
            try:
                data = response.json()
                if isinstance(data, list):
                    return True, f"{len(data)} items", time_ms
                elif isinstance(data, dict):
                    return True, "OK", time_ms
                else:
                    return True, "OK", time_ms
            except:
                return True, "OK (no JSON)", time_ms
        else:
            try:
                error = response.json().get('detail', response.text[:50])
            except:
                error = response.text[:50]
            return False, f"Status {response.status_code}: {error}", time_ms
            
    except requests.exceptions.Timeout:
        time_ms = (datetime.now() - start_time).total_seconds() * 1000
        return False, "TIMEOUT", time_ms
    except requests.exceptions.ConnectionError:
        return False, "CONNECTION REFUSED", 0
    except Exception as e:
        time_ms = (datetime.now() - start_time).total_seconds() * 1000
        return False, str(e)[:50], time_ms

def run_tests(base_url):
    """Run all API tests"""
    results = {"pass": 0, "fail": 0, "warn": 0}
    
    print_header(f"Testing API: {base_url}")
    
    # ============ Health Check ============
    print(f"\n{Colors.BOLD}🏥 Health Check{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/health")
    print_result("/health", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    success, msg, time_ms = test_endpoint(base_url, "GET", "/")
    print_result("/", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Auth ============
    print(f"\n{Colors.BOLD}🔐 Authentication{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "POST", "/auth/login", 
        {"username": "godsgiftadmin", "password": "godsgift1234"})
    print_result("/auth/login", "POST", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Products ============
    print(f"\n{Colors.BOLD}📦 Products{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/products")
    print_result("/products", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    success, msg, time_ms = test_endpoint(base_url, "GET", "/products?is_active=true")
    print_result("/products?is_active=true", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Bills ============
    print(f"\n{Colors.BOLD}🧾 Bills{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/bills")
    print_result("/bills", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    success, msg, time_ms = test_endpoint(base_url, "GET", "/bills?limit=10")
    print_result("/bills?limit=10", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Payments ============
    print(f"\n{Colors.BOLD}💳 Payments{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/payments")
    print_result("/payments", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Expenses ============
    print(f"\n{Colors.BOLD}💰 Expenses{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/expenses/")
    print_result("/expenses/", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    success, msg, time_ms = test_endpoint(base_url, "GET", "/expenses/monthly-totals")
    print_result("/expenses/monthly-totals", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Dashboard ============
    print(f"\n{Colors.BOLD}📊 Dashboard{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/dashboard/stats")
    print_result("/dashboard/stats", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    success, msg, time_ms = test_endpoint(base_url, "GET", "/dashboard/analytics?days=30")
    print_result("/dashboard/analytics?days=30", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Debug ============
    print(f"\n{Colors.BOLD}🔧 Debug{Colors.RESET}")
    success, msg, time_ms = test_endpoint(base_url, "GET", "/debug/db-status")
    print_result("/debug/db-status", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    success, msg, time_ms = test_endpoint(base_url, "GET", "/debug/env-check")
    print_result("/debug/env-check", "GET", "PASS" if success else "FAIL", msg, time_ms)
    results["pass" if success else "fail"] += 1
    
    # ============ Summary ============
    print_header("Test Summary")
    total = results["pass"] + results["fail"] + results["warn"]
    print(f"  {Colors.GREEN}✅ Passed: {results['pass']}{Colors.RESET}")
    print(f"  {Colors.RED}❌ Failed: {results['fail']}{Colors.RESET}")
    print(f"  {Colors.YELLOW}⚠️  Warnings: {results['warn']}{Colors.RESET}")
    print(f"  📊 Total: {total}")
    
    if results["fail"] == 0:
        print(f"\n  {Colors.GREEN}{Colors.BOLD}🎉 All tests passed!{Colors.RESET}")
    else:
        print(f"\n  {Colors.RED}{Colors.BOLD}⚠️  Some tests failed. Please check the errors above.{Colors.RESET}")
    
    return results["fail"] == 0

def test_bill_creation(base_url):
    """Test creating a bill (separate test)"""
    print_header("Bill Creation Test")
    
    # First get products
    try:
        response = requests.get(f"{base_url}/products", timeout=30)
        products = response.json()
        if not products:
            print(f"{Colors.YELLOW}⚠️  No products found. Skipping bill creation test.{Colors.RESET}")
            return
        
        product = products[0]
        
        # Create test bill
        bill_data = {
            "customer_name": "Test Customer (API Test)",
            "customer_phone": "9999999999",
            "items": [{
                "product_id": str(product['id']),
                "product_name": product['name'],
                "quantity": 1,
                "unit": "piece",
                "rate": 100,
                "item_total": 100
            }],
            "bill_total": 100,
            "order_source": "offline",
            "created_by": "test_script"
        }
        
        success, msg, time_ms = test_endpoint(base_url, "POST", "/bills", bill_data, 201)
        print_result("/bills (CREATE)", "POST", "PASS" if success else "FAIL", msg, time_ms)
        
        if success:
            print(f"  {Colors.GREEN}✅ Bill creation working!{Colors.RESET}")
        else:
            print(f"  {Colors.RED}❌ Bill creation failed: {msg}{Colors.RESET}")
            
    except Exception as e:
        print(f"  {Colors.RED}❌ Error: {e}{Colors.RESET}")

if __name__ == "__main__":
    # Determine which server to test
    if len(sys.argv) > 1 and sys.argv[1] == "prod":
        base_url = PROD_URL
        print(f"\n{Colors.YELLOW}🌐 Testing PRODUCTION server{Colors.RESET}")
    else:
        base_url = LOCAL_URL
        print(f"\n{Colors.BLUE}🏠 Testing LOCAL server{Colors.RESET}")
    
    # Run tests
    all_passed = run_tests(base_url)
    
    # Ask if user wants to test bill creation
    if all_passed:
        print(f"\n{Colors.YELLOW}Run bill creation test? (y/n): {Colors.RESET}", end="")
        try:
            if input().lower() == 'y':
                test_bill_creation(base_url)
        except:
            pass
    
    print()

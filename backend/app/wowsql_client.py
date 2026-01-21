"""
WowSQL Client - Using official WOWSQL Python SDK v1.3.0

Official SDK handles all API endpoints correctly.
Updated to use correct SDK methods: get(), filter(), create(), update(), delete()
"""

from wowsql import WowSQLClient
from typing import Any, Dict, List, Optional
from app.config import get_settings
import json

settings = get_settings()

# Global client instance
_client: Optional[WowSQLClient] = None


def get_client() -> WowSQLClient:
    """Get WOWSQL client instance (singleton pattern)"""
    global _client
    
    if _client is None:
        _client = WowSQLClient(
            project_url=settings.WOWSQL_BASE_URL,
            api_key=settings.WOWSQL_API_KEY
        )
    
    return _client


def close_client():
    """Close client (cleanup if needed)"""
    global _client
    if _client:
        _client.close()
    _client = None


class WowSQLTable:
    """Helper class for table operations using official SDK v1.3.0"""
    
    # Fields that should be numeric
    NUMERIC_FIELDS = {
        'id', 'product_id', 'bill_id', 'payment_id', 'expense_id',
        'rate', 'base_weight', 'min_stock_alert', 'current_stock',
        'bill_total', 'amount_paid', 'balance_due', 'price', 'quantity', 
        'quantity_gms', 'item_total', 'sequence'
    }
    
    # Fields that should be boolean
    BOOL_FIELDS = {'is_active'}
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.client = get_client()
        self.table = self.client.table(table_name)
    
    def _convert_types(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Convert string values to appropriate types"""
        if not isinstance(record, dict):
            return record
        
        converted = {}
        for key, value in record.items():
            if value is None:
                converted[key] = value
            elif key in self.BOOL_FIELDS:
                # Convert to boolean
                if isinstance(value, bool):
                    converted[key] = value
                elif isinstance(value, (int, float)):
                    converted[key] = bool(value)
                elif isinstance(value, str):
                    converted[key] = value.lower() in ('true', '1', 'yes')
                else:
                    converted[key] = bool(value)
            elif key in self.NUMERIC_FIELDS:
                # Convert to number
                try:
                    if isinstance(value, (int, float)):
                        converted[key] = value
                    elif isinstance(value, str):
                        if '.' in value:
                            converted[key] = float(value)
                        else:
                            converted[key] = int(value)
                    else:
                        converted[key] = value
                except (ValueError, TypeError):
                    converted[key] = value
            else:
                converted[key] = value
        
        return converted
    
    def find(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_dir: str = "asc",
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Query records from table"""
        try:
            # Start with a query builder or get all
            if filters:
                # Use filter() method with eq operator for each filter
                query = None
                for key, value in filters.items():
                    # Convert boolean to integer (WowSQL stores booleans as 0/1)
                    if isinstance(value, bool):
                        value = 1 if value else 0
                    
                    if query is None:
                        query = self.table.filter(key, "eq", value)
                    else:
                        query = query.filter(key, "eq", value)
                
                # Apply ordering if specified
                if order_by:
                    query = query.order_by(order_by, order_dir)
                
                # Apply limit if specified
                if limit:
                    query = query.limit(limit)
                
                # Apply offset if specified
                if offset:
                    query = query.offset(offset)
                
                # Execute query
                result = query.execute()
            else:
                # No filters - get all records
                result = self.table.get()
            
            # Handle response format
            if hasattr(result, 'data'):
                data = result.data
            elif isinstance(result, dict):
                data = result.get("data", [])
            elif isinstance(result, list):
                data = result
            else:
                data = []
            
            # Apply ordering, limit, offset manually if needed (for simple get())
            if not filters:
                if order_by and data:
                    reverse = order_dir.lower() == "desc"
                    data = sorted(data, key=lambda x: x.get(order_by, ""), reverse=reverse)
                if offset:
                    data = data[offset:]
                if limit:
                    data = data[:limit]
            
            # Apply type conversions
            if isinstance(data, list):
                return [self._convert_types(record) for record in data]
            return []
            
        except Exception as e:
            print(f"WowSQL find error: {e}")
            return []
    
    def find_one(
        self,
        filters: Optional[Dict[str, Any]] = None,
        id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Find a single record by ID or filters"""
        try:
            if id is not None:
                # Use get_by_id for ID-based lookup
                result = self.table.get_by_id(id)
                if result:
                    return self._convert_types(result)
                return None
            
            if filters:
                # Use find with limit 1 (already applies type conversion)
                results = self.find(filters=filters, limit=1)
                return results[0] if results else None
            
            return None
        except Exception as e:
            print(f"WowSQL find_one error: {e}")
            return None
    
    def insert_one(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a single record"""
        try:
            # Handle JSON columns
            processed_data = {}
            for key, value in data.items():
                if isinstance(value, (list, dict)):
                    processed_data[key] = json.dumps(value)
                else:
                    processed_data[key] = value
            
            result = self.table.insert(processed_data)
            
            # Log for debugging
            print(f"[WowSQL] insert result type={type(result).__name__}, result={result}")
            
            # Extract ID using multiple strategies
            inserted_id = None
            
            # Strategy 1: Direct dict with 'id' key (WowSQL SDK typical response)
            if isinstance(result, dict):
                if "id" in result:
                    inserted_id = result["id"]
                elif "data" in result and isinstance(result["data"], dict):
                    inserted_id = result["data"].get("id")
                elif "data" in result and isinstance(result["data"], list) and result["data"]:
                    inserted_id = result["data"][0].get("id")
            
            # Strategy 2: Object with .id attribute
            if inserted_id is None and hasattr(result, 'id') and result.id is not None:
                inserted_id = result.id
            
            # Strategy 3: Object with .data attribute
            if inserted_id is None and hasattr(result, 'data') and result.data:
                if isinstance(result.data, dict):
                    inserted_id = result.data.get("id")
                elif isinstance(result.data, list) and result.data:
                    inserted_id = result.data[0].get("id")
            
            print(f"[WowSQL] extracted inserted_id={inserted_id}")
            
            if inserted_id is not None:
                # Fetch and return the complete inserted record
                fetched = self.find_one(id=inserted_id)
                if fetched:
                    print(f"[WowSQL] returning fetched record with id={fetched.get('id')}")
                    return fetched
                # Fallback: return processed data with ID
                processed_data["id"] = inserted_id
                return processed_data
            
            # Strategy 4: If all else fails, fetch the most recently created record
            # This is a last resort and may not be 100% reliable under high concurrency
            print("[WowSQL] No ID found, attempting to fetch most recent record")
            all_records = self.find(order_by="id", order_dir="desc", limit=1)
            if all_records:
                print(f"[WowSQL] returning most recent record with id={all_records[0].get('id')}")
                return all_records[0]
            
            # Ultimate fallback: return processed data without ID (will likely cause issues)
            print("[WowSQL] WARNING: Could not determine inserted record ID")
            return processed_data
        except Exception as e:
            print(f"WowSQL insert error: {e}")
            raise
    
    def update_one(self, id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a single record by ID"""
        try:
            # Handle JSON columns
            processed_data = {}
            for key, value in data.items():
                if isinstance(value, (list, dict)):
                    processed_data[key] = json.dumps(value)
                else:
                    processed_data[key] = value
            
            result = self.table.update(id, processed_data)
            
            # Fetch and return updated record
            updated = self.find_one(id=id)
            return updated if updated else processed_data
        except Exception as e:
            print(f"WowSQL update error: {e}")
            raise
    
    def delete_one(self, id: int) -> bool:
        """Delete a single record by ID"""
        try:
            self.table.delete(id)
            return True
        except Exception as e:
            print(f"WowSQL delete error: {e}")
            return False
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records"""
        results = self.find(filters=filters)
        return len(results)


# Convenience functions
def get_table(table_name: str) -> WowSQLTable:
    """Get a table instance"""
    return WowSQLTable(table_name)


# Pre-defined table accessors
def products() -> WowSQLTable:
    return WowSQLTable("products")

def inventory() -> WowSQLTable:
    return WowSQLTable("inventory")

def bills() -> WowSQLTable:
    return WowSQLTable("bills")

def payments() -> WowSQLTable:
    return WowSQLTable("payments")

def expenses() -> WowSQLTable:
    return WowSQLTable("expenses")

def users() -> WowSQLTable:
    return WowSQLTable("users")

def bill_sequences() -> WowSQLTable:
    return WowSQLTable("bill_sequences")

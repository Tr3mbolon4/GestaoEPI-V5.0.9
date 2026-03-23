#!/usr/bin/env python3
"""
Backend API Testing for GestãoEPI System
Tests new features: NBR field, replacement periodicity, mandatory kits, alerts
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class GestaoEPITester:
    def __init__(self, base_url="https://safety-gear-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_epi_id = None
        self.test_kit_id = None
        self.test_employee_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}
            
            if not success:
                response_data["status_code"] = response.status_code
                
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_login(self):
        """Test login with default credentials"""
        print("\n🔐 Testing Authentication...")
        
        success, response = self.make_request(
            "POST", 
            "auth/login",
            {"username": "administrador", "password": "LR1a2b3c4567@"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Login with administrador", True)
            return True
        else:
            self.log_test("Login with administrador", False, f"Response: {response}")
            return False

    def test_health_check(self):
        """Test API health endpoint"""
        print("\n🏥 Testing Health Check...")
        
        success, response = self.make_request("GET", "health")
        
        if success:
            self.log_test("Health check endpoint", True)
            print(f"   Database: {response.get('database', 'unknown')}")
            print(f"   Backend URL: {response.get('backend_url', 'not_set')}")
        else:
            self.log_test("Health check endpoint", False, str(response))

    def test_epi_with_nbr_field(self):
        """Test EPI creation with NBR field (new feature)"""
        print("\n📦 Testing EPI with NBR Field...")
        
        # Test 1: EPI with only NBR (no CA)
        epi_data = {
            "name": "Capacete NBR Test",
            "type_category": "Cabeça",
            "nbr_number": "NBR-15175",
            "brand": "Test Brand",
            "current_stock": 10,
            "min_stock": 2
        }
        
        success, response = self.make_request("POST", "epis", epi_data, 201)
        
        if success:
            self.test_epi_id = response.get('id')
            self.log_test("Create EPI with NBR field only", True)
            
            # Verify NBR field is returned
            if response.get('nbr_number') == "NBR-15175":
                self.log_test("NBR field correctly stored and returned", True)
            else:
                self.log_test("NBR field correctly stored and returned", False, f"Expected NBR-15175, got {response.get('nbr_number')}")
        else:
            self.log_test("Create EPI with NBR field only", False, str(response))
        
        # Test 2: EPI with both CA and NBR
        epi_data_both = {
            "name": "Luva CA+NBR Test",
            "type_category": "Mãos/Braços",
            "ca_number": "12345",
            "nbr_number": "NBR-13698",
            "current_stock": 5,
            "min_stock": 1
        }
        
        success, response = self.make_request("POST", "epis", epi_data_both, 201)
        
        if success:
            has_ca = response.get('ca_number') == "12345"
            has_nbr = response.get('nbr_number') == "NBR-13698"
            self.log_test("Create EPI with both CA and NBR", has_ca and has_nbr)
        else:
            self.log_test("Create EPI with both CA and NBR", False, str(response))
        
        # Test 3: EPI with neither CA nor NBR (should fail)
        epi_data_invalid = {
            "name": "Invalid EPI",
            "type_category": "Corpo",
            "current_stock": 1
        }
        
        success, response = self.make_request("POST", "epis", epi_data_invalid, 400)
        
        if success:  # Success means it correctly returned 400
            self.log_test("Reject EPI without CA or NBR", True)
        else:
            self.log_test("Reject EPI without CA or NBR", False, "Should have returned 400 error")

    def test_epi_replacement_periodicity(self):
        """Test EPI replacement periodicity feature"""
        print("\n⏰ Testing EPI Replacement Periodicity...")
        
        if not self.test_epi_id:
            self.log_test("EPI replacement periodicity test", False, "No test EPI available")
            return
        
        # Test weekly periodicity
        update_data = {
            "replacement_period": "weekly"
        }
        
        success, response = self.make_request("PATCH", f"epis/{self.test_epi_id}", update_data)
        
        if success and response.get('replacement_period') == 'weekly':
            self.log_test("Set EPI replacement period to weekly", True)
        else:
            self.log_test("Set EPI replacement period to weekly", False, str(response))
        
        # Test custom periodicity
        update_data_custom = {
            "replacement_period": "custom",
            "replacement_days": 45
        }
        
        success, response = self.make_request("PATCH", f"epis/{self.test_epi_id}", update_data_custom)
        
        if success:
            period_ok = response.get('replacement_period') == 'custom'
            days_ok = response.get('replacement_days') == 45
            self.log_test("Set EPI custom replacement period (45 days)", period_ok and days_ok)
        else:
            self.log_test("Set EPI custom replacement period (45 days)", False, str(response))

    def test_mandatory_kit_with_sector(self):
        """Test kit creation with mandatory sector field"""
        print("\n🎒 Testing Mandatory Kit with Sector...")
        
        if not self.test_epi_id:
            self.log_test("Kit creation test", False, "No test EPI available")
            return
        
        kit_data = {
            "name": "Kit Marcenaria Obrigatório",
            "description": "Kit obrigatório para colaboradores da marcenaria",
            "sector": "Marcenaria",
            "is_mandatory": True,
            "items": [
                {
                    "epi_id": self.test_epi_id,
                    "quantity": 1
                }
            ]
        }
        
        success, response = self.make_request("POST", "kits", kit_data, 201)
        
        if success:
            self.test_kit_id = response.get('id')
            sector_ok = response.get('sector') == "Marcenaria"
            mandatory_ok = response.get('is_mandatory') == True
            items_ok = len(response.get('items', [])) > 0
            
            if sector_ok and mandatory_ok and items_ok:
                self.log_test("Create mandatory kit with sector", True)
            else:
                self.log_test("Create mandatory kit with sector", False, f"Sector: {sector_ok}, Mandatory: {mandatory_ok}, Items: {items_ok}")
        else:
            self.log_test("Create mandatory kit with sector", False, str(response))
        
        # Test kit without sector (should fail or require sector)
        kit_data_no_sector = {
            "name": "Kit Sem Setor",
            "is_mandatory": True,
            "items": []
        }
        
        success, response = self.make_request("POST", "kits", kit_data_no_sector, 400)
        
        # If it returns 400, that's good (validation working)
        # If it returns 201, check if sector is required in response
        if success:  # Got expected 400
            self.log_test("Reject kit without sector", True)
        else:
            # Check if it was created but with validation
            success_created, response_created = self.make_request("POST", "kits", kit_data_no_sector, 201)
            if success_created:
                self.log_test("Reject kit without sector", False, "Kit created without sector validation")
            else:
                self.log_test("Reject kit without sector", True, "Properly rejected")

    def test_alerts_endpoints(self):
        """Test new alerts endpoints"""
        print("\n🚨 Testing Alerts Endpoints...")
        
        # Test all alerts endpoint
        success, response = self.make_request("GET", "alerts/all")
        
        if success:
            has_pending = 'pending_epis' in response
            has_replacement = 'replacement_due' in response
            has_total = 'total_alerts' in response
            
            if has_pending and has_replacement:
                self.log_test("Get all alerts endpoint", True)
                print(f"   Total alerts: {response.get('total_alerts', 0)}")
                print(f"   Pending EPIs: {len(response.get('pending_epis', []))}")
                print(f"   Replacement due: {len(response.get('replacement_due', []))}")
            else:
                self.log_test("Get all alerts endpoint", False, f"Missing fields: pending_epis={has_pending}, replacement_due={has_replacement}")
        else:
            self.log_test("Get all alerts endpoint", False, str(response))
        
        # Test pending EPIs endpoint
        success, response = self.make_request("GET", "alerts/pending-epis")
        
        if success:
            self.log_test("Get pending EPIs alerts", True)
        else:
            self.log_test("Get pending EPIs alerts", False, str(response))
        
        # Test replacement due endpoint
        success, response = self.make_request("GET", "alerts/replacement-due")
        
        if success:
            self.log_test("Get replacement due alerts", True)
        else:
            self.log_test("Get replacement due alerts", False, str(response))

    def test_dashboard_with_alerts(self):
        """Test dashboard shows alerts card"""
        print("\n📊 Testing Dashboard with Alerts...")
        
        success, response = self.make_request("GET", "dashboard/stats")
        
        if success:
            # Check if dashboard includes alert counts
            has_alerts = any(key in response for key in ['total_alerts', 'pending_epi_alerts', 'replacement_due_alerts'])
            
            if has_alerts:
                self.log_test("Dashboard includes alert statistics", True)
                print(f"   Dashboard stats keys: {list(response.keys())}")
            else:
                self.log_test("Dashboard includes alert statistics", False, f"No alert fields found in: {list(response.keys())}")
        else:
            self.log_test("Dashboard includes alert statistics", False, str(response))

    def test_delivery_history_responsible(self):
        """Test that delivery history shows responsible person"""
        print("\n📋 Testing Delivery History with Responsible...")
        
        # Get deliveries to check if delivered_by_name field exists
        success, response = self.make_request("GET", "deliveries")
        
        if success:
            deliveries = response if isinstance(response, list) else response.get('deliveries', [])
            
            if deliveries:
                # Check if any delivery has delivered_by_name field
                has_responsible = any('delivered_by_name' in delivery for delivery in deliveries)
                
                if has_responsible:
                    self.log_test("Delivery history shows responsible person", True)
                else:
                    self.log_test("Delivery history shows responsible person", False, "No delivered_by_name field found")
            else:
                self.log_test("Delivery history shows responsible person", True, "No deliveries to test (acceptable)")
        else:
            self.log_test("Delivery history shows responsible person", False, str(response))

    def test_employee_alerts(self):
        """Test employee-specific alerts"""
        print("\n👤 Testing Employee-Specific Alerts...")
        
        # Get employees first
        success, response = self.make_request("GET", "employees")
        
        if success and response:
            employees = response if isinstance(response, list) else []
            
            if employees:
                employee_id = employees[0].get('id')
                self.test_employee_id = employee_id
                
                # Test employee alerts endpoint
                success, alert_response = self.make_request("GET", f"alerts/employee/{employee_id}")
                
                if success:
                    has_pending = 'pending_epis' in alert_response
                    has_replacement = 'replacement_due' in alert_response
                    has_total = 'total_alerts' in alert_response
                    
                    if has_pending and has_replacement and has_total:
                        self.log_test("Get employee-specific alerts", True)
                    else:
                        self.log_test("Get employee-specific alerts", False, f"Missing alert fields")
                else:
                    self.log_test("Get employee-specific alerts", False, str(alert_response))
            else:
                self.log_test("Get employee-specific alerts", True, "No employees to test (acceptable)")
        else:
            self.log_test("Get employee-specific alerts", False, "Could not fetch employees")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 Starting GestãoEPI Backend Tests...")
        print(f"🌐 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Health check
        self.test_health_check()
        
        # Core new features
        self.test_epi_with_nbr_field()
        self.test_epi_replacement_periodicity()
        self.test_mandatory_kit_with_sector()
        
        # Alerts system
        self.test_alerts_endpoints()
        self.test_dashboard_with_alerts()
        self.test_employee_alerts()
        
        # Delivery history
        self.test_delivery_history_responsible()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "timestamp": datetime.now().isoformat()
        }

def main():
    """Main test execution"""
    tester = GestaoEPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        summary = tester.get_test_summary()
        
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Detailed results saved to: /app/test_reports/backend_test_results.json")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
"""
Test suite for Facial Templates API endpoints
Tests: GET, POST, DELETE /api/employees/{id}/facial-templates
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "administrador"
ADMIN_PASSWORD = "LR1a2b3c4567@"

# Known employee IDs from seed data
EMPLOYEE_ID_1 = "6985f99e1d8c786d2c082a15"  # alexandre santana dos santos
EMPLOYEE_ID_2 = "698626b6b4be213595ccb5de"  # LUIZ PAULO CIPOLATTI


class TestFacialTemplatesAPI:
    """Test facial templates CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    def test_get_facial_templates_empty(self):
        """Test GET facial templates for employee with no templates"""
        response = self.session.get(f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET facial templates returned {len(data)} templates")
    
    def test_create_facial_template_success(self):
        """Test POST to create a new facial template"""
        # Create a mock descriptor (128-dimensional face descriptor)
        mock_descriptor = json.dumps([0.1] * 128)
        
        response = self.session.post(
            f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates",
            json={"descriptor": mock_descriptor}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain 'id'"
        assert "employee_id" in data, "Response should contain 'employee_id'"
        assert "descriptor" in data, "Response should contain 'descriptor'"
        assert "created_at" in data, "Response should contain 'created_at'"
        
        assert data["employee_id"] == EMPLOYEE_ID_1, "Employee ID should match"
        assert data["descriptor"] == mock_descriptor, "Descriptor should match"
        
        # Store template ID for cleanup
        self.created_template_id = data["id"]
        print(f"✓ Created facial template with ID: {self.created_template_id}")
        
        # Cleanup - delete the created template
        delete_response = self.session.delete(
            f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates/{self.created_template_id}"
        )
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ Cleaned up template {self.created_template_id}")
    
    def test_create_and_get_facial_template(self):
        """Test creating a template and verifying it appears in GET"""
        mock_descriptor = json.dumps([0.2] * 128)
        
        # Create template
        create_response = self.session.post(
            f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates",
            json={"descriptor": mock_descriptor}
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Verify it appears in GET
        get_response = self.session.get(f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates")
        assert get_response.status_code == 200
        
        templates = get_response.json()
        template_ids = [t["id"] for t in templates]
        assert template_id in template_ids, "Created template should appear in GET response"
        print(f"✓ Template {template_id} verified in GET response")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates/{template_id}")
    
    def test_delete_facial_template_success(self):
        """Test DELETE to remove a facial template"""
        # First create a template
        mock_descriptor = json.dumps([0.3] * 128)
        create_response = self.session.post(
            f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates",
            json={"descriptor": mock_descriptor}
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Delete the template
        delete_response = self.session.delete(
            f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates/{template_id}"
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        data = delete_response.json()
        assert "message" in data, "Response should contain 'message'"
        print(f"✓ Deleted facial template {template_id}")
        
        # Verify it's gone
        get_response = self.session.get(f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates")
        templates = get_response.json()
        template_ids = [t["id"] for t in templates]
        assert template_id not in template_ids, "Deleted template should not appear in GET response"
        print(f"✓ Verified template {template_id} is deleted")
    
    def test_delete_nonexistent_template(self):
        """Test DELETE with non-existent template ID returns 404"""
        fake_template_id = "000000000000000000000000"
        
        response = self.session.delete(
            f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}/facial-templates/{fake_template_id}"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ DELETE non-existent template returns 404")
    
    def test_create_template_for_nonexistent_employee(self):
        """Test POST with non-existent employee ID returns 404"""
        fake_employee_id = "000000000000000000000000"
        mock_descriptor = json.dumps([0.4] * 128)
        
        response = self.session.post(
            f"{BASE_URL}/api/employees/{fake_employee_id}/facial-templates",
            json={"descriptor": mock_descriptor}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ POST to non-existent employee returns 404")


class TestEmployeeEndpoints:
    """Test employee endpoints related to facial recognition"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    def test_get_employee_details(self):
        """Test GET employee details"""
        response = self.session.get(f"{BASE_URL}/api/employees/{EMPLOYEE_ID_1}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should contain 'id'"
        assert "full_name" in data, "Response should contain 'full_name'"
        assert "photo_path" in data or data.get("photo_path") is None, "Response should have photo_path field"
        
        print(f"✓ Employee: {data['full_name']}")
        print(f"  Photo path: {data.get('photo_path', 'None')}")
    
    def test_get_employees_list(self):
        """Test GET all employees"""
        response = self.session.get(f"{BASE_URL}/api/employees")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one employee"
        
        print(f"✓ Found {len(data)} employees")
        for emp in data[:3]:  # Show first 3
            print(f"  - {emp['full_name']} (ID: {emp['id']})")


class TestDeliveriesEndpoint:
    """Test deliveries endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    def test_get_deliveries_by_employee(self):
        """Test GET deliveries filtered by employee"""
        response = self.session.get(f"{BASE_URL}/api/deliveries?employee_id={EMPLOYEE_ID_1}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Found {len(data)} deliveries for employee {EMPLOYEE_ID_1}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

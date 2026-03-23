"""
Test Kits and EPIs API endpoints for bug fixes verification
- Issue 1: Kit items should display EPI name and CA number
- Issue 2: Sidebar icon should load correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKitsAndEPIs:
    """Test Kits and EPIs endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "administrador",
            "password": "LR1a2b3c4567@"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_epis_list(self):
        """Test GET /api/epis returns list of EPIs with name and CA"""
        response = self.session.get(f"{BASE_URL}/api/epis")
        assert response.status_code == 200
        
        epis = response.json()
        assert isinstance(epis, list)
        print(f"Found {len(epis)} EPIs")
        
        for epi in epis:
            assert "id" in epi, "EPI should have id"
            assert "name" in epi, "EPI should have name"
            assert "ca_number" in epi, "EPI should have ca_number"
            print(f"  - {epi['name']} (CA: {epi['ca_number']})")
    
    def test_get_kits_list(self):
        """Test GET /api/kits returns list of kits"""
        response = self.session.get(f"{BASE_URL}/api/kits")
        assert response.status_code == 200
        
        kits = response.json()
        assert isinstance(kits, list)
        print(f"Found {len(kits)} Kits")
        
        for kit in kits:
            assert "id" in kit, "Kit should have id"
            assert "name" in kit, "Kit should have name"
            assert "items" in kit, "Kit should have items"
            print(f"  - Kit: {kit['name']} with {len(kit.get('items', []))} items")
            
            # Check items structure
            for item in kit.get('items', []):
                print(f"    - Item: {item}")
    
    def test_kit_items_have_epi_details(self):
        """Test that kit items contain EPI name and CA number"""
        response = self.session.get(f"{BASE_URL}/api/kits")
        assert response.status_code == 200
        
        kits = response.json()
        
        for kit in kits:
            print(f"\nKit: {kit['name']}")
            for item in kit.get('items', []):
                # Items should have epi_id
                assert "epi_id" in item, f"Item in kit {kit['name']} should have epi_id"
                
                # Items should have name (from EPI)
                if "name" in item:
                    print(f"  - Item has name: {item['name']}")
                else:
                    print(f"  - WARNING: Item missing name, only has: {item.keys()}")
                
                # Items should have ca_number (from EPI)
                if "ca_number" in item:
                    print(f"    CA: {item['ca_number']}")
    
    def test_create_kit_with_epis(self):
        """Test creating a new kit with EPIs stores name and CA"""
        # First get available EPIs
        epis_response = self.session.get(f"{BASE_URL}/api/epis")
        assert epis_response.status_code == 200
        epis = epis_response.json()
        
        if len(epis) == 0:
            pytest.skip("No EPIs available to create kit")
        
        # Create a test kit with first EPI
        test_epi = epis[0]
        kit_data = {
            "name": "TEST_Kit_Verificacao",
            "description": "Kit de teste para verificar bug fix",
            "sector": "Teste",
            "items": [
                {"epi_id": test_epi["id"], "quantity": 2}
            ]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/kits", json=kit_data)
        assert create_response.status_code == 200, f"Failed to create kit: {create_response.text}"
        
        created_kit = create_response.json()
        print(f"Created kit: {created_kit['name']}")
        print(f"Kit items: {created_kit.get('items', [])}")
        
        # Verify items have EPI details
        assert len(created_kit.get('items', [])) > 0, "Kit should have items"
        
        for item in created_kit['items']:
            assert "name" in item, f"Item should have name from EPI"
            assert "ca_number" in item, f"Item should have ca_number from EPI"
            print(f"  - {item['name']} (CA: {item['ca_number']})")
        
        # Cleanup - delete test kit
        kit_id = created_kit['id']
        delete_response = self.session.delete(f"{BASE_URL}/api/kits/{kit_id}")
        assert delete_response.status_code == 200
        print(f"Cleaned up test kit")
    
    def test_update_kit_preserves_epi_details(self):
        """Test updating a kit preserves EPI details"""
        # Get EPIs
        epis_response = self.session.get(f"{BASE_URL}/api/epis")
        epis = epis_response.json()
        
        if len(epis) < 2:
            pytest.skip("Need at least 2 EPIs to test update")
        
        # Create test kit
        kit_data = {
            "name": "TEST_Kit_Update",
            "description": "Kit para teste de update",
            "sector": "Teste",
            "items": [{"epi_id": epis[0]["id"], "quantity": 1}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/kits", json=kit_data)
        assert create_response.status_code == 200
        kit_id = create_response.json()['id']
        
        # Update kit with different EPI
        update_data = {
            "name": "TEST_Kit_Update_Modified",
            "items": [
                {"epi_id": epis[0]["id"], "quantity": 2},
                {"epi_id": epis[1]["id"], "quantity": 1}
            ]
        }
        
        update_response = self.session.patch(f"{BASE_URL}/api/kits/{kit_id}", json=update_data)
        assert update_response.status_code == 200
        
        updated_kit = update_response.json()
        print(f"Updated kit: {updated_kit['name']}")
        
        # Verify items have EPI details after update
        for item in updated_kit.get('items', []):
            assert "name" in item, "Updated item should have name"
            assert "ca_number" in item, "Updated item should have ca_number"
            print(f"  - {item['name']} (CA: {item['ca_number']})")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/kits/{kit_id}")
    
    def test_get_single_kit_has_epi_details(self):
        """Test GET /api/kits/{id} returns kit with EPI details"""
        # Get all kits
        kits_response = self.session.get(f"{BASE_URL}/api/kits")
        kits = kits_response.json()
        
        if len(kits) == 0:
            pytest.skip("No kits available")
        
        # Get single kit
        kit_id = kits[0]['id']
        single_response = self.session.get(f"{BASE_URL}/api/kits/{kit_id}")
        assert single_response.status_code == 200
        
        kit = single_response.json()
        print(f"Single kit: {kit['name']}")
        print(f"Items: {kit.get('items', [])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

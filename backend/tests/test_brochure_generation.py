import pytest
import os
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from apps.accounts.models import Tenant
from apps.properties.models import Property
from apps.properties.tasks import generate_brochure_pdf_task

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_setup():
    tenant = Tenant.objects.create(name="Apex Agency", brand_color="#38bdf8")
    user = User.objects.create_user(
        email="broker.test@example.com",
        password="brokerpassword123",
        name="Broker Partner",
        phone="+919999999999",
        tenant=tenant,
        role="BROKER"
    )
    # Create a property listing
    property_obj = Property.objects.create(
        tenant=tenant,
        created_by=user,
        title="Luxury Duplex in Pune",
        description="Premium duplex with modern interior and scenic views.",
        price=15000000.00,
        property_type="APARTMENT",
        status="AVAILABLE",
        city="Pune",
        area="Koregaon Park",
        bhk=3,
        square_feet=1800.00,
        amenities=["pool", "gym", "security"]
    )
    return tenant, user, property_obj

@pytest.mark.django_db
def test_brochure_endpoint_auth(api_client, test_setup):
    """
    Ensure unauthenticated requests to the brochure endpoint fail.
    """
    tenant, user, property_obj = test_setup
    url = f"/api/properties/{property_obj.id}/brochure/"
    response = api_client.get(url)
    assert response.status_code == 401

@pytest.mark.django_db
def test_brochure_endpoint_success(api_client, test_setup):
    """
    Ensure authenticated requests can successfully compile and get the brochure URL.
    """
    tenant, user, property_obj = test_setup
    api_client.force_authenticate(user=user)

    url = f"/api/properties/{property_obj.id}/brochure/"
    response = api_client.get(url)
    
    assert response.status_code == 200
    assert "brochure_url" in response.data
    assert f"brochure_{property_obj.id}.pdf" in response.data["brochure_url"]

    # Verify that the brochure PDF file was generated and saved
    pdf_filename = f"brochures/brochure_{property_obj.id}.pdf"
    assert default_storage.exists(pdf_filename)
    
    # Read the file contents and verify it starts with standard PDF magic number bytes (%PDF)
    with default_storage.open(pdf_filename, 'rb') as f:
        pdf_bytes = f.read()
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')

    # Cleanup the test file
    default_storage.delete(pdf_filename)

@pytest.mark.django_db
def test_brochure_task_missing_property():
    """
    Ensure the Celery task returns None gracefully if the property does not exist.
    """
    res = generate_brochure_pdf_task("nonexistent-uuid")
    assert res is None

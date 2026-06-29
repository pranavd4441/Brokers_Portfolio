import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from apps.accounts.models import Tenant, User
from apps.properties.models import Property
from apps.sharing.models import ShareLink
from apps.leads.models import Lead
from apps.accounts.tenant_context import set_current_tenant_id, clear_current_tenant_id

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_setup():
    # Tenant A Setup
    tenant_a = Tenant.objects.create(name="Apex Realty", brand_color="#10B981")
    user_a = User.objects.create_user(
        email="broker.a@apex.com",
        password="securepass123",
        name="Broker A",
        phone="+919999999999",
        tenant=tenant_a,
        role="BROKER"
    )
    
    # Tenant B Setup
    tenant_b = Tenant.objects.create(name="Beacon Realty", brand_color="#3B82F6")
    user_b = User.objects.create_user(
        email="broker.b@beacon.com",
        password="securepass123",
        name="Broker B",
        phone="+918888888888",
        tenant=tenant_b,
        role="BROKER"
    )
    
    return {
        "tenant_a": tenant_a, "user_a": user_a,
        "tenant_b": tenant_b, "user_b": user_b,
    }

@pytest.mark.django_db
@patch('apps.whatsapp.services.get_whatsapp_gateway')
def test_gated_lead_creation_on_cta_click(mock_gateway_fn, api_client, test_setup):
    """
    Test that calling PublicEventLogView with WHATSAPP_CLICK/PHONE_CLICK
    and buyer info automatically creates a Lead in the database.
    """
    setup = test_setup
    tenant_a = setup["tenant_a"]
    user_a = setup["user_a"]
    
    mock_gateway = MagicMock()
    mock_gateway_fn.return_value = mock_gateway

    # 1. Create a property in Tenant A
    set_current_tenant_id(str(tenant_a.id))
    property_obj = Property.objects.create(
        tenant=tenant_a,
        created_by=user_a,
        title="Sea View Villa",
        description="Luxurious villa",
        price=35000000.00,
        city="Mumbai",
        area="Bandra"
    )
    clear_current_tenant_id()

    # 2. Trigger CTA click through public event logger
    log_url = reverse('analytics_log_event')
    response = api_client.post(log_url, {
        "property": str(property_obj.id),
        "event_type": "WHATSAPP_CLICK",
        "buyer_name": "Alice Smith",
        "buyer_phone": "+919876543210"
    })
    
    assert response.status_code == 201
    
    # 3. Verify Lead record is created in the database for Tenant A
    # Since we aren't authenticated, use unfiltered to query
    lead = Lead.objects_unfiltered.filter(property=property_obj).first()
    assert lead is not None
    assert lead.buyer_name == "Alice Smith"
    assert lead.phone == "+919876543210"
    assert lead.source == "WHATSAPP_CLICK"
    assert lead.tenant == tenant_a
    assert lead.status == "NEW"
    assert lead.analytics_event is not None


@pytest.mark.django_db
def test_lead_api_tenant_isolation(api_client, test_setup):
    """
    Test that the /api/leads/ endpoint strictly isolates lead records by tenant.
    """
    setup = test_setup
    tenant_a = setup["tenant_a"]
    user_a = setup["user_a"]
    tenant_b = setup["tenant_b"]
    user_b = setup["user_b"]

    # 1. Create Property & Lead in Tenant A
    set_current_tenant_id(str(tenant_a.id))
    prop_a = Property.objects.create(
        tenant=tenant_a, created_by=user_a, title="Apex Flat", price=1000000, city="Pune", area="Kothrud"
    )
    lead_a = Lead.objects.create(
        tenant=tenant_a, property=prop_a, source="GATED_MODAL", buyer_name="A-Buyer", phone="+911111111111"
    )
    clear_current_tenant_id()

    # 2. Create Property & Lead in Tenant B
    set_current_tenant_id(str(tenant_b.id))
    prop_b = Property.objects.create(
        tenant=tenant_b, created_by=user_b, title="Beacon House", price=2000000, city="Pune", area="Baner"
    )
    lead_b = Lead.objects.create(
        tenant=tenant_b, property=prop_b, source="GATED_MODAL", buyer_name="B-Buyer", phone="+912222222222"
    )
    clear_current_tenant_id()

    # 3. Authenticate as Broker A and verify they can only see Lead A
    api_client.force_authenticate(user=user_a)
    
    # List leads
    response = api_client.get("/api/leads/")
    assert response.status_code == 200
    lead_ids = [item["id"] for item in response.data]
    assert lead_a.id in lead_ids
    assert lead_b.id not in lead_ids

    # Try retrieving Lead B (should fail with 404)
    retrieve_b_response = api_client.get(f"/api/leads/{lead_b.id}/")
    assert retrieve_b_response.status_code == 404

    # Update Lead A
    patch_response = api_client.patch(f"/api/leads/{lead_a.id}/", {
        "status": "CONTACTED",
        "notes": "Spoke to buyer, scheduling visit"
    })
    assert patch_response.status_code == 200
    
    # Verify DB update
    set_current_tenant_id(str(tenant_a.id))
    lead_a.refresh_from_db()
    assert lead_a.status == "CONTACTED"
    assert lead_a.notes == "Spoke to buyer, scheduling visit"
    clear_current_tenant_id()


@pytest.mark.django_db
@patch('apps.whatsapp.services.get_whatsapp_gateway')
def test_whatsapp_nlp_lead_commands(mock_gateway_fn, api_client, test_setup):
    """
    Test that sending NLP lead queries to the WhatsApp webhook resolves correctly.
    """
    setup = test_setup
    tenant_a = setup["tenant_a"]
    user_a = setup["user_a"]

    mock_gateway = MagicMock()
    mock_gateway_fn.return_value = mock_gateway

    webhook_url = reverse('whatsapp_webhook')
    from_number = f"whatsapp:{user_a.phone}"

    # 1. Create Property and Lead in Tenant A
    set_current_tenant_id(str(tenant_a.id))
    property_obj = Property.objects.create(
        tenant=tenant_a,
        created_by=user_a,
        title="Bandra Mansion",
        description="Huge mansion",
        price=80000000.00,
        city="Mumbai",
        area="Bandra"
    )
    # Generate ShareLink for listings query fallback
    ShareLink.objects.create(
        property=property_obj,
        created_by=user_a,
        tenant=tenant_a
    )
    lead = Lead.objects.create(
        tenant=tenant_a,
        property=property_obj,
        source="WHATSAPP_CLICK",
        buyer_name="Charlie Brown",
        phone="+919777777777"
    )
    clear_current_tenant_id()

    # 2. Query "new leads today" via WhatsApp webhook
    response = api_client.post(webhook_url, {
        "From": from_number,
        "Body": "new leads today",
        "NumMedia": "0"
    })
    assert response.status_code == 200
    
    # Verify mock gateway sent back a list containing Charlie Brown
    mock_gateway.send_message.assert_called_once()
    args, _ = mock_gateway.send_message.call_args
    message_body = args[1]
    assert "Today's New Leads" in message_body
    assert "Charlie Brown" in message_body
    assert "Bandra Mansion" in message_body
    mock_gateway.reset_mock()

    # 3. Query "leads for Bandra Mansion"
    response = api_client.post(webhook_url, {
        "From": from_number,
        "Body": "leads for Bandra Mansion",
        "NumMedia": "0"
    })
    assert response.status_code == 200
    
    # Verify mock gateway response
    mock_gateway.send_message.assert_called_once()
    args, _ = mock_gateway.send_message.call_args
    message_body = args[1]
    assert "Leads for Bandra Mansion" in message_body
    assert "Charlie Brown" in message_body
    assert "+919777777777" in message_body

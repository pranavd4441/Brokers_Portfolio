from datetime import timedelta
from unittest.mock import ANY, MagicMock, patch

import pytest
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User
from apps.accounts.tenant_context import clear_current_tenant_id, set_current_tenant_id
from apps.analytics.models import AnalyticsEvent
from apps.leads.models import Lead
from apps.properties.models import Property


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_setup():
    # Create tenants
    tenant_a = Tenant.objects.create(
        name="Tenant A", listing_expiry_days=15, brand_color="#10B981"
    )
    tenant_b = Tenant.objects.create(
        name="Tenant B", listing_expiry_days=45, brand_color="#3B82F6"
    )

    # Create users
    owner_a = User.objects.create_user(
        email="owner.a@example.com",
        password="securepass123",
        name="Owner A",
        phone="+919999999991",
        tenant=tenant_a,
        role="OWNER",
    )
    broker_a = User.objects.create_user(
        email="broker.a@example.com",
        password="securepass123",
        name="Broker A",
        phone="+919999999992",
        tenant=tenant_a,
        role="BROKER",
    )
    owner_b = User.objects.create_user(
        email="owner.b@example.com",
        password="securepass123",
        name="Owner B",
        phone="+919999999993",
        tenant=tenant_b,
        role="OWNER",
    )

    return {
        "tenant_a": tenant_a,
        "tenant_b": tenant_b,
        "owner_a": owner_a,
        "broker_a": broker_a,
        "owner_b": owner_b,
    }


@pytest.mark.django_db
def test_auto_calculation_of_expiry(test_setup):
    """
    Verify that property's expires_at is set correctly on creation
    based on the tenant's listing_expiry_days.
    """
    tenant_a = test_setup["tenant_a"]
    owner_a = test_setup["owner_a"]

    tenant_b = test_setup["tenant_b"]
    owner_b = test_setup["owner_b"]

    # Create property under Tenant A context
    set_current_tenant_id(str(tenant_a.id))
    prop_a = Property.objects.create(
        title="Property A",
        description="Test A",
        price=1000000.00,
        city="Pune",
        area="Koregaon Park",
        created_by=owner_a,
        tenant=tenant_a,
    )
    clear_current_tenant_id()

    # Create property under Tenant B context
    set_current_tenant_id(str(tenant_b.id))
    prop_b = Property.objects.create(
        title="Property B",
        description="Test B",
        price=2000000.00,
        city="Mumbai",
        area="Bandra",
        created_by=owner_b,
        tenant=tenant_b,
    )
    clear_current_tenant_id()

    # Check expiry days (delta should be approximately tenant.listing_expiry_days)
    now = timezone.now()
    expected_expiry_a = prop_a.created_at + timedelta(days=15)
    expected_expiry_b = prop_b.created_at + timedelta(days=45)

    # Allow small difference due to processing time
    assert abs((prop_a.expires_at - expected_expiry_a).total_seconds()) < 5
    assert abs((prop_b.expires_at - expected_expiry_b).total_seconds()) < 5


@pytest.mark.django_db
def test_auto_expiry_command(test_setup):
    """
    Verify that the check_expired_properties command transitions expired properties to EXPIRED.
    """
    tenant_a = test_setup["tenant_a"]
    owner_a = test_setup["owner_a"]

    set_current_tenant_id(str(tenant_a.id))

    # Property 1: Expired
    prop_expired = Property.objects.create(
        title="Expired Property",
        description="Test",
        price=1000000.00,
        city="Pune",
        area="Kothrud",
        created_by=owner_a,
        tenant=tenant_a,
        expires_at=timezone.now() - timedelta(days=1),
    )

    # Property 2: Not Expired
    prop_active = Property.objects.create(
        title="Active Property",
        description="Test",
        price=2000000.00,
        city="Pune",
        area="Kothrud",
        created_by=owner_a,
        tenant=tenant_a,
        expires_at=timezone.now() + timedelta(days=5),
    )

    # Property 3: Sold (even if expires_at is in past, it shouldn't transition to EXPIRED)
    prop_sold = Property.objects.create(
        title="Sold Property",
        description="Test",
        price=3000000.00,
        city="Pune",
        area="Kothrud",
        created_by=owner_a,
        tenant=tenant_a,
        status="SOLD",
        expires_at=timezone.now() - timedelta(days=1),
    )

    clear_current_tenant_id()

    # Run command
    call_command("check_expired_properties")

    # Refresh and assert
    prop_expired.refresh_from_db()
    prop_active.refresh_from_db()
    prop_sold.refresh_from_db()

    assert prop_expired.status == "EXPIRED"
    assert prop_active.status == "AVAILABLE"
    assert prop_sold.status == "SOLD"


@pytest.mark.django_db
def test_denormalized_counters(test_setup):
    """
    Verify that creating leads and page views increments views_count and leads_count atomically.
    Also verify deleting leads decrements leads_count.
    """
    tenant_a = test_setup["tenant_a"]
    owner_a = test_setup["owner_a"]

    set_current_tenant_id(str(tenant_a.id))

    prop = Property.objects.create(
        title="Counter Property",
        description="Test",
        price=1000000.00,
        city="Pune",
        area="Kothrud",
        created_by=owner_a,
        tenant=tenant_a,
    )

    # Initially 0
    assert prop.views_count == 0
    assert prop.leads_count == 0

    # 1. Page Views
    # Create page view event
    event1 = AnalyticsEvent.objects.create(
        property=prop, event_type="PAGE_VIEW", device_type="DESKTOP", ip_hash="hash1"
    )
    prop.refresh_from_db()
    assert prop.views_count == 1

    event2 = AnalyticsEvent.objects.create(
        property=prop, event_type="PAGE_VIEW", device_type="MOBILE", ip_hash="hash2"
    )
    prop.refresh_from_db()
    assert prop.views_count == 2

    # Other event types should not increment views_count
    AnalyticsEvent.objects.create(
        property=prop,
        event_type="WHATSAPP_CLICK",
        device_type="MOBILE",
        ip_hash="hash2",
    )
    prop.refresh_from_db()
    assert prop.views_count == 2

    # 2. Leads
    lead1 = Lead.objects.create(
        tenant=tenant_a,
        property=prop,
        buyer_name="Buyer One",
        phone="+919876543210",
        source="GATED_MODAL",
    )
    prop.refresh_from_db()
    assert prop.leads_count == 1

    lead2 = Lead.objects.create(
        tenant=tenant_a,
        property=prop,
        buyer_name="Buyer Two",
        phone="+919876543211",
        source="WHATSAPP_CLICK",
    )
    prop.refresh_from_db()
    assert prop.leads_count == 2

    # 3. Delete Lead
    lead1.delete()
    prop.refresh_from_db()
    assert prop.leads_count == 1

    clear_current_tenant_id()


@pytest.mark.django_db
@patch("apps.whatsapp.services.get_whatsapp_gateway")
def test_nlp_whatsapp_commands(mock_gateway_fn, api_client, test_setup):
    """
    Test status and price updates using NLP WhatsApp command webhooks.
    """
    tenant_a = test_setup["tenant_a"]
    broker_a = test_setup["broker_a"]

    mock_gateway = MagicMock()
    mock_gateway_fn.return_value = mock_gateway

    # Create a property
    set_current_tenant_id(str(tenant_a.id))
    prop = Property.objects.create(
        title="Penthouse in Kalyani Nagar",
        description="Luxury",
        price=15000000.00,
        city="Pune",
        area="Kalyani Nagar",
        created_by=broker_a,
        tenant=tenant_a,
    )
    clear_current_tenant_id()

    webhook_url = reverse("whatsapp_webhook")
    from_number = f"whatsapp:{broker_a.phone}"

    # 1. Test status update NLP: "mark Penthouse in Kalyani Nagar as booked"
    response = api_client.post(
        webhook_url,
        {
            "From": from_number,
            "Body": "mark Penthouse in Kalyani Nagar as booked",
            "NumMedia": "0",
        },
    )
    assert response.status_code == 200

    prop.refresh_from_db()
    assert prop.status == "BOOKED"

    # 2. Test status update NLP with invalid status
    response = api_client.post(
        webhook_url,
        {
            "From": from_number,
            "Body": "mark Penthouse in Kalyani Nagar as super_sold",
            "NumMedia": "0",
        },
    )
    assert response.status_code == 200
    # Status should remain unchanged
    prop.refresh_from_db()
    assert prop.status == "BOOKED"

    # 3. Test price update NLP: "update price of Penthouse in Kalyani Nagar to 1.6 Cr"
    response = api_client.post(
        webhook_url,
        {
            "From": from_number,
            "Body": "update price of Penthouse in Kalyani Nagar to 1.6 Cr",
            "NumMedia": "0",
        },
    )
    assert response.status_code == 200

    prop.refresh_from_db()
    assert prop.price == 16000000.00

    # 4. Test price update NLP with Lakhs: "update price of Penthouse in Kalyani Nagar to 95 L"
    response = api_client.post(
        webhook_url,
        {
            "From": from_number,
            "Body": "update price of Penthouse in Kalyani Nagar to 95 L",
            "NumMedia": "0",
        },
    )
    assert response.status_code == 200

    prop.refresh_from_db()
    assert prop.price == 9500000.00


@pytest.mark.django_db
def test_team_assignment_endpoint(api_client, test_setup):
    """
    Verify that /api/auth/team/ returns only users belonging to the authenticated user's tenant.
    """
    tenant_a = test_setup["tenant_a"]
    broker_a = test_setup["broker_a"]
    owner_b = test_setup["owner_b"]

    # Authenticate as Broker A (Tenant A)
    api_client.force_authenticate(user=broker_a)

    response = api_client.get("/api/auth/team/")
    assert response.status_code == 200

    # Should return Owner A and Broker A, but not Owner B
    user_ids = [user["id"] for user in response.data]
    assert str(test_setup["owner_a"].id) in user_ids
    assert str(broker_a.id) in user_ids
    assert str(owner_b.id) not in user_ids


@pytest.mark.django_db
@patch("apps.whatsapp.services.get_whatsapp_gateway")
def test_daily_performance_digest_command(mock_gateway_fn, test_setup):
    """
    Verify that send_daily_performance_digest compiles metrics and dispatches WhatsApp digest messages.
    """
    tenant_a = test_setup["tenant_a"]
    broker_a = test_setup["broker_a"]

    mock_gateway = MagicMock()
    mock_gateway_fn.return_value = mock_gateway

    set_current_tenant_id(str(tenant_a.id))

    # Create property
    prop = Property.objects.create(
        title="Digest Property",
        description="Test",
        price=1000000.00,
        city="Pune",
        area="Kothrud",
        created_by=broker_a,
        tenant=tenant_a,
    )

    # Log a view and a lead
    AnalyticsEvent.objects.create(
        property=prop, event_type="PAGE_VIEW", device_type="DESKTOP", ip_hash="hash1"
    )

    Lead.objects.create(
        tenant=tenant_a,
        property=prop,
        buyer_name="Digest Lead",
        phone="+919876543210",
        source="GATED_MODAL",
    )

    clear_current_tenant_id()

    # Run digest command
    call_command("send_daily_performance_digest")

    # Check that a message was sent to broker_a
    # broker_a has phone number '+919999999992'
    mock_gateway.send_message.assert_any_call(broker_a.phone, ANY)

    # Retrieve the message sent
    sent_args = [call[0] for call in mock_gateway.send_message.call_args_list]
    digest_message = next(arg[1] for arg in sent_args if arg[0] == broker_a.phone)

    assert "PropertyOS Daily Performance Digest" in digest_message
    assert tenant_a.name in digest_message
    assert "Active Listings:* 1" in digest_message
    assert "New Page Views (24h):* 1" in digest_message
    assert "New Leads Captured (24h):* 1" in digest_message

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User
from apps.accounts.tenant_context import clear_current_tenant_id, set_current_tenant_id
from apps.analytics.models import AnalyticsEvent
from apps.audit.models import AuditLog
from apps.properties.models import Property


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_data():
    tenant = Tenant.objects.create(name="Central Brokerage")
    user = User.objects.create_user(
        email="test.broker@example.com",
        password="password123",
        name="Test Broker",
        tenant=tenant,
        role="OWNER",
    )
    return tenant, user


@pytest.mark.django_db
def test_property_audit_logging(api_client, test_data):
    """
    Test that creating, updating, and deleting properties
    automatically generates corresponding AuditLog entries with detailed changes.
    """
    tenant, user = test_data
    api_client.force_authenticate(user=user)

    # 1. Test Property Creation & CREATE log
    create_data = {
        "title": "Modern Penthouse",
        "description": "Penthouse with private deck",
        "price": 12000000.00,
        "property_type": "APARTMENT",
        "city": "Pune",
        "area": "Koregaon Park",
        "bhk": 3,
        "square_feet": 1800.00,
        "amenities": ["Deck", "Elevator"],
    }

    response = api_client.post("/api/properties/", create_data, format="json")
    assert response.status_code == 201
    property_id = response.data["id"]

    # Assert AuditLog has a CREATE entry
    set_current_tenant_id(str(tenant.id))
    create_logs = AuditLog.objects.filter(record_id=property_id, action="CREATE")
    assert create_logs.count() == 1
    assert create_logs.first().actor == user
    clear_current_tenant_id()

    # 2. Test Property Update & UPDATE log (with price and status differences)
    update_data = {
        "title": "Modern Penthouse (Renovated)",
        "price": 12500000.00,  # Price increased
        "status": "NEGOTIATION",  # Status changed
        "description": "Penthouse with private deck",
        "property_type": "APARTMENT",
        "city": "Pune",
        "area": "Koregaon Park",
        "bhk": 3,
    }

    response = api_client.put(
        f"/api/properties/{property_id}/", update_data, format="json"
    )
    assert response.status_code == 200

    # Assert AuditLog has an UPDATE entry with correct delta
    set_current_tenant_id(str(tenant.id))
    update_logs = AuditLog.objects.filter(record_id=property_id, action="UPDATE")
    assert update_logs.count() == 1
    update_log = update_logs.first()
    assert update_log.actor == user

    # Check that price and status changes were recorded
    changes = update_log.changes_payload
    assert "price" in changes
    assert changes["price"]["old"] == 12000000.00
    assert changes["price"]["new"] == 12500000.00
    assert "status" in changes
    assert changes["status"]["old"] == "AVAILABLE"
    assert changes["status"]["new"] == "NEGOTIATION"
    clear_current_tenant_id()

    # 3. Test Property Deletion & DELETE log
    response = api_client.delete(f"/api/properties/{property_id}/")
    assert response.status_code == 204

    # Assert AuditLog has a DELETE entry
    set_current_tenant_id(str(tenant.id))
    delete_logs = AuditLog.objects.filter(record_id=property_id, action="DELETE")
    assert delete_logs.count() == 1
    assert delete_logs.first().actor == user
    clear_current_tenant_id()


@pytest.mark.django_db
def test_analytics_logging(api_client, test_data):
    """
    Test that the public (zero-auth) event logger successfully
    records traffic events like PAGE_VIEW and WHATSAPP_CLICK.
    """
    tenant, user = test_data

    # Create a property first in database
    set_current_tenant_id(str(tenant.id))
    prop = Property.objects.create(
        title="Listing to Share",
        description="To test clicks",
        price=5000000.00,
        city="Pune",
        area="Kothrud",
        created_by=user,
    )
    clear_current_tenant_id()

    # 1. Log PAGE_VIEW event publicly (No Auth)
    log_data = {"property": str(prop.id), "event_type": "PAGE_VIEW"}

    # Hit the public endpoint
    response = api_client.post("/api/analytics/log/", log_data, format="json")
    assert response.status_code == 201

    # Verify event was saved
    events = AnalyticsEvent.objects.filter(property=prop, event_type="PAGE_VIEW")
    assert events.count() == 1
    event = events.first()
    assert (
        event.device_type == "DESKTOP"
    )  # Default in testing since User-Agent is empty
    assert event.browser == "Other"

    # 2. Log WHATSAPP_CLICK event publicly (No Auth)
    click_data = {"property": str(prop.id), "event_type": "WHATSAPP_CLICK"}

    response = api_client.post("/api/analytics/log/", click_data, format="json")
    assert response.status_code == 201

    # Verify click was saved
    click_events = AnalyticsEvent.objects.filter(
        property=prop, event_type="WHATSAPP_CLICK"
    )
    assert click_events.count() == 1

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User
from apps.accounts.tenant_context import clear_current_tenant_id, set_current_tenant_id
from apps.properties.models import Property


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_tenant_data():
    def _create(name, email, company_name):
        tenant = Tenant.objects.create(name=company_name)
        user = User.objects.create_user(
            email=email,
            password="secure_password_123",
            name=name,
            tenant=tenant,
            role="OWNER",
        )
        return tenant, user

    return _create


@pytest.mark.django_db
def test_tenant_query_isolation(create_tenant_data):
    """
    Test that database queries are automatically and strictly isolated
    by the tenant_id in the thread-local context.
    """
    # 1. Create Tenant A and Tenant B
    tenant_a, user_a = create_tenant_data(
        "Broker A", "broker.a@example.com", "Agency A"
    )
    tenant_b, user_b = create_tenant_data(
        "Broker B", "broker.b@example.com", "Agency B"
    )

    # 2. Create properties inside Tenant A
    set_current_tenant_id(str(tenant_a.id))
    prop_a1 = Property.objects.create(
        title="Luxury Villa A1",
        description="Tenant A property",
        price=15000000.00,
        city="Pune",
        area="Baner",
        created_by=user_a,
    )
    prop_a2 = Property.objects.create(
        title="Apartment A2",
        description="Tenant A property 2",
        price=8000000.00,
        city="Pune",
        area="Baner",
        created_by=user_a,
    )
    clear_current_tenant_id()

    # 3. Create property inside Tenant B
    set_current_tenant_id(str(tenant_b.id))
    prop_b = Property.objects.create(
        title="Commercial B1",
        description="Tenant B property",
        price=25000000.00,
        city="Pune",
        area="Kalyani Nagar",
        created_by=user_b,
    )
    clear_current_tenant_id()

    # 4. Verify isolation when Tenant A context is set
    set_current_tenant_id(str(tenant_a.id))
    a_listings = Property.objects.all()
    assert a_listings.count() == 2
    assert prop_a1 in a_listings
    assert prop_a2 in a_listings
    assert prop_b not in a_listings
    clear_current_tenant_id()

    # 5. Verify isolation when Tenant B context is set
    set_current_tenant_id(str(tenant_b.id))
    b_listings = Property.objects.all()
    assert b_listings.count() == 1
    assert prop_b in b_listings
    assert prop_a1 not in b_listings
    clear_current_tenant_id()


@pytest.mark.django_db
def test_api_tenant_isolation(api_client, create_tenant_data):
    """
    Test that API requests using JWT authentication automatically
    restrict access to data belonging only to the user's active tenant.
    """
    # 1. Setup Tenants and Users
    tenant_a, user_a = create_tenant_data(
        "Broker A", "broker.a@example.com", "Agency A"
    )
    tenant_b, user_b = create_tenant_data(
        "Broker B", "broker.b@example.com", "Agency B"
    )

    # 2. Create property in Tenant A
    set_current_tenant_id(str(tenant_a.id))
    prop_a = Property.objects.create(
        title="Tenant A Property",
        description="Private",
        price=10000000.00,
        city="Mumbai",
        area="Bandra",
        created_by=user_a,
    )
    clear_current_tenant_id()

    # 3. Authenticate as User B (Tenant B)
    api_client.force_authenticate(user=user_b)

    # 4. Attempt to retrieve Tenant A's property via API
    # Since Property.objects.all() is tenant-filtered, User B's request
    # (whose tenant context is Tenant B) will query Tenant B's properties
    # and find nothing, returning a 404 Not Found.
    response = api_client.get(f"/api/properties/{prop_a.id}/")
    assert response.status_code == 404

    # 5. Attempt to list properties as User B
    # Should return 0 properties since Tenant B has none
    list_response = api_client.get("/api/properties/")
    assert list_response.status_code == 200
    assert len(list_response.data) == 0

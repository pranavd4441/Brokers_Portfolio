import pytest
from django.test import RequestFactory
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User
from apps.properties.models import Property
from apps.sharing.models import ShareLink
from apps.sharing.serializers import ShareLinkSerializer


@pytest.mark.django_db
def test_registration_creates_attributed_fourteen_day_pilot():
    client = APIClient()
    response = client.post(
        "/api/v1/auth/register/",
        {
            "company_name": "Baner Founding Realty",
            "name": "Asha Broker",
            "phone": "+919999999999",
            "email": "asha@example.com",
            "password": "StrongPass!42",
            "acquisition_source": "field-clinic",
            "acquisition_city": "Pune",
            "referral_code": "BROKER01",
            "preferred_locale": "mr",
            "marketing_consent": True,
            "dpdp_consent": True,
        },
        format="json",
    )
    assert response.status_code == 201
    tenant = Tenant.objects.get(name="Baner Founding Realty")
    assert tenant.plan_status == "PILOT"
    assert (tenant.pilot_ends_at - tenant.pilot_started_at).days == 14
    assert tenant.acquisition_source == "field-clinic"
    assert tenant.referred_by_code == "BROKER01"
    assert tenant.preferred_locale == "mr"
    assert tenant.dpdp_consent_at is not None
    assert tenant.referral_code


@pytest.mark.django_db
def test_onboarding_reports_real_share_action_not_automatic_link():
    tenant = Tenant.objects.create(name="Pilot Realty", logo_url="https://example.com/logo.png", whatsapp_default_number="+919999999999")
    user = User.objects.create_user(email="pilot@example.com", password="StrongPass!42", name="Pilot Broker", phone="+919999999999", tenant=tenant, role="OWNER")
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get("/api/v1/auth/onboarding/")
    assert response.status_code == 200
    assert response.data["share_count"] == 0
    assert response.data["activated"] is False


@pytest.mark.django_db
def test_whatsapp_share_is_readable_and_uses_propertyos_local_frontend():
    tenant = Tenant.objects.create(name="Readable Realty")
    user = User.objects.create_user(email="share@example.com", password="StrongPass!42", name="Share Broker", tenant=tenant)
    prop = Property.objects.create(
        tenant=tenant,
        created_by=user,
        title="Farm Land in Mulshi",
        description="Clear title farm land",
        price=7500000,
        property_type="PLOT",
        city="Pune",
        area="Mulshi",
    )
    link = ShareLink.objects_unfiltered.get(property=prop)
    request = RequestFactory().get("/api/v1/sharing/links/", HTTP_HOST="localhost:8000")
    data = ShareLinkSerializer(link, context={"request": request}).data
    assert data["full_share_url"].startswith("http://localhost:3100/p/")
    assert data["whatsapp_share_text"].startswith("🏡 *Premium Property Alert!*")
    assert "%F0%9F" not in data["whatsapp_share_text"]
    assert data["full_share_url"] in data["whatsapp_share_text"]

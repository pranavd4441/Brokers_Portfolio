from unittest.mock import MagicMock, patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User
from apps.properties.models import Property
from apps.sharing.models import ShareLink
from apps.whatsapp.models import WhatsAppSession
from apps.whatsapp.services import RegexParserService


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_setup():
    # 1. Create a Tenant and a registered User/Broker with a phone number
    tenant = Tenant.objects.create(name="Apex Realty Group", brand_color="#10B981")
    broker = User.objects.create_user(
        email="apex.broker@example.com",
        password="securepass123",
        name="Pranav Divekar",
        phone="+919999999999",  # International format
        tenant=tenant,
        role="BROKER",
    )
    return tenant, broker


def test_regex_parser_logic():
    """
    Test that the fallback RegexParserService accurately extracts property metadata from raw text.
    """
    sample_text = "2 BHK flat in Bandra West for sale. Price is 75 L. 1100 square feet."
    parsed = RegexParserService.parse(sample_text)

    assert parsed["property_type"] == "APARTMENT"
    assert parsed["price"] == 7500000.0
    assert parsed["bhk"] == 2
    assert parsed["square_feet"] == 1100.0
    assert parsed["area"] == "Bandra West"

    sample_plot = "Expansive plot in hill area. Price 1.5 Cr, size 2 acres."
    parsed_plot = RegexParserService.parse(sample_plot)
    assert parsed_plot["property_type"] == "PLOT"
    assert parsed_plot["price"] == 15000000.0
    assert "2 Acres" in parsed_plot["description"]


@pytest.mark.django_db
@patch("apps.whatsapp.services.get_whatsapp_gateway")
def test_whatsapp_onboarding_conversation_flow(mock_gateway_fn, api_client, test_setup):
    """
    Test the complete end-to-end listing creation flow via simulated Twilio webhooks.
    """
    tenant, broker = test_setup
    mock_gateway = MagicMock()
    mock_gateway_fn.return_value = mock_gateway

    webhook_url = reverse("whatsapp_webhook")
    from_number = "whatsapp:+919999999999"

    # Step 1: Send "Create listing" to initialize session
    response = api_client.post(
        webhook_url, {"From": from_number, "Body": "Create listing", "NumMedia": "0"}
    )
    assert response.status_code == 200

    # Verify session transitions to COLLECTING
    session = WhatsAppSession.objects.get(phone_number="+919999999999")
    assert session.state == "COLLECTING"
    assert mock_gateway.send_message.called

    # Step 2: Send property details text
    response = api_client.post(
        webhook_url,
        {
            "From": from_number,
            "Body": "3 BHK luxury flat in Bandra. Price is 1.2 Cr, area 1600 sqft.",
            "NumMedia": "0",
        },
    )
    assert response.status_code == 200

    # Verify metadata is parsed and stored in session
    session.refresh_from_db()
    assert session.metadata["price"] == 12000000.0
    assert session.metadata["bhk"] == 3
    assert session.metadata["square_feet"] == 1600.0
    assert session.metadata["area"] == "Bandra"

    # Step 3: Send "done" to finalize publishing
    response = api_client.post(
        webhook_url, {"From": from_number, "Body": "done", "NumMedia": "0"}
    )
    assert response.status_code == 200

    # Verify session returns to IDLE
    session.refresh_from_db()
    assert session.state == "IDLE"
    assert session.metadata == {}

    # Verify Property record is successfully created in database
    property_obj = Property.objects_unfiltered.filter(created_by=broker).first()
    assert property_obj is not None
    assert property_obj.title == "3 BHK Apartment in Bandra"
    assert property_obj.price == 12000000.0
    assert property_obj.bhk == 3
    assert property_obj.square_feet == 1600.0
    assert property_obj.area == "Bandra"

    # Verify ShareLink is generated for the property
    share_link = ShareLink.objects_unfiltered.filter(property=property_obj).first()
    assert share_link is not None
    assert share_link.slug != ""


@pytest.mark.django_db
@patch("apps.whatsapp.services.get_whatsapp_gateway")
def test_whatsapp_realtime_lead_alerts(mock_gateway_fn, api_client, test_setup):
    """
    Test that clicking WhatsApp/Call on a public listing triggers a real-time WhatsApp alert to the broker.
    """
    tenant, broker = test_setup
    mock_gateway = MagicMock()
    mock_gateway_fn.return_value = mock_gateway

    # 1. Create a mock property and share link
    property_obj = Property.objects.create(
        tenant=tenant,
        created_by=broker,
        title="Sea View Penthouse",
        description="Luxury penthouse",
        price=50000000.00,
        city="Mumbai",
        area="Bandra West",
    )
    share_link = property_obj.share_links.first()

    # 2. Trigger a WHATSAPP_CLICK analytics event via public endpoint
    log_url = reverse("analytics_log_event")
    response = api_client.post(
        log_url,
        {
            "property": str(property_obj.id),
            "event_type": "WHATSAPP_CLICK",
            "buyer_name": "John Doe",
            "buyer_phone": "+918888888888",
        },
    )
    assert response.status_code == 201

    # 3. Wait/Verify that the background thread dispatched the alert to the broker's phone number
    # We use a short wait or directly assert since threading starts instantly
    import time

    time.sleep(0.5)  # Give background thread a split second to execute

    mock_gateway.send_message.assert_called_once()
    args, kwargs = mock_gateway.send_message.call_args
    recipient = args[0]
    message_body = args[1]

    assert recipient == broker.phone
    assert "New Lead" in message_body
    assert "John Doe" in message_body
    assert "+918888888888" in message_body
    assert "Sea View Penthouse" in message_body
    assert share_link.slug in message_body

from unittest.mock import MagicMock, patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User
from apps.properties.models import Property
from apps.sharing.models import ShareLink
from apps.whatsapp.models import ConversationMessage, WhatsAppSession
from apps.whatsapp.services import GeminiAudioTranscriptionService, RegexParserService


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

    clubhouse_apartment = RegexParserService.parse(
        "3 BHK apartment in Wakad, Pune for sale with clubhouse. Price 1.35 Cr."
    )
    assert clubhouse_apartment["property_type"] == "APARTMENT"
    assert clubhouse_apartment["area"] == "Wakad"
    assert clubhouse_apartment["city"] == "Pune"


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

    # Confirm extracted details and save a private review draft.
    for body in ("btn_details_ok", "btn_skip_amenities", "btn_save_draft"):
        response = api_client.post(
            webhook_url, {"From": from_number, "Body": body, "NumMedia": "0"}
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
    assert property_obj.status == "DRAFT"
    assert property_obj.source == "WHATSAPP"
    assert property_obj.intake_metadata["reviewed"] is False

    # Verify ShareLink is generated for the property
    share_link = ShareLink.objects_unfiltered.filter(property=property_obj).first()
    assert share_link is not None
    assert share_link.slug != ""


@pytest.mark.django_db
@patch("apps.whatsapp.services.get_whatsapp_gateway")
def test_guided_whatsapp_listing_wizard_creates_one_private_review_draft(
    mock_gateway_fn, api_client, test_setup
):
    """Exercise every user-facing step in the current five-step listing wizard."""
    _, broker = test_setup
    mock_gateway = MagicMock()
    mock_gateway.send_message.return_value = True
    mock_gateway_fn.return_value = mock_gateway

    webhook_url = reverse("whatsapp_webhook")
    sender = "whatsapp:+919999999999"

    def send(body):
        response = api_client.post(
            webhook_url,
            {"From": sender, "Body": body, "NumMedia": "0"},
        )
        assert response.status_code == 200
        return WhatsAppSession.objects.get(phone_number="+919999999999")

    session = send("create listing")
    assert session.state == "COLLECTING"
    assert session.metadata["step"] == "AWAITING_PHOTOS"

    session = send("btn_skip_photos")
    assert session.metadata["step"] == "AWAITING_DETAILS"

    session = send(
        "3 BHK luxury flat in Baner for sale, 1.25 Cr, 1650 sqft, east-facing with balcony"
    )
    assert session.metadata["step"] == "CONFIRMING_DETAILS"
    assert session.metadata["bhk"] == 3
    assert session.metadata["price"] == 12_500_000
    assert session.metadata["square_feet"] == 1650
    assert session.metadata["area"] == "Baner"

    session = send("btn_details_edit")
    assert session.metadata["step"] == "EDITING_WIZARD_FIELD"
    session = send("wiz_edit_city")
    assert session.metadata["step"] == "AWAITING_WIZARD_FIELD_VALUE"
    session = send("Pune")
    assert session.metadata["step"] == "CONFIRMING_DETAILS"
    assert session.metadata["city"] == "Pune"

    session = send("btn_details_ok")
    assert session.metadata["step"] == "CONFIRMING_AMENITIES"
    session = send("btn_skip_amenities")
    assert session.metadata["step"] == "CONFIRMING_DRAFT"
    session = send("btn_save_draft")

    assert session.state == "IDLE"
    assert session.metadata == {}

    property_obj = Property.objects_unfiltered.get(created_by=broker)
    assert property_obj.title == "3 BHK Apartment in Baner"
    assert property_obj.city == "Pune"
    assert property_obj.status == "DRAFT"
    assert property_obj.source == "WHATSAPP"
    assert property_obj.intake_metadata["extraction_source"] == "RULES"

    share_links = ShareLink.objects_unfiltered.filter(property=property_obj)
    assert share_links.count() == 1
    share_link = share_links.get()

    final_message = ConversationMessage.objects.filter(
        session=session, direction="OUTBOUND"
    ).last()
    assert final_message is not None
    assert "Private draft created" in final_message.body
    assert f"/dashboard/properties/{property_obj.id}/review" in final_message.body


@pytest.mark.django_db
@patch("apps.whatsapp.services.get_whatsapp_gateway")
def test_duplicate_provider_message_is_ignored(mock_gateway_fn, api_client, test_setup):
    mock_gateway_fn.return_value = MagicMock()
    webhook_url = reverse("whatsapp_webhook")
    payload = {
        "From": "whatsapp:+919999999999",
        "Body": "create listing",
        "NumMedia": "0",
        "MessageSid": "SM-propertyos-dedup-1",
    }

    first = api_client.post(webhook_url, payload)
    second = api_client.post(webhook_url, payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "duplicate_ignored"
    assert (
        ConversationMessage.objects.filter(
            provider_message_id="SM-propertyos-dedup-1"
        ).count()
        == 1
    )


def test_audio_transcription_never_returns_fabricated_property_details(settings):
    settings.GEMINI_API_KEY = ""
    assert GeminiAudioTranscriptionService.transcribe(b"audio", "audio/ogg") == ""


@pytest.mark.django_db
def test_reviewed_whatsapp_draft_can_be_published(api_client, test_setup):
    tenant, broker = test_setup
    property_obj = Property.objects.create(
        tenant=tenant,
        created_by=broker,
        title="3 BHK in Baner",
        description="Broker-provided details reviewed in PropertyOS.",
        price=16_500_000,
        city="Pune",
        area="Baner",
        status="DRAFT",
        source="WHATSAPP",
    )
    api_client.force_authenticate(user=broker)

    response = api_client.post(
        reverse("property-publish", kwargs={"pk": property_obj.id})
    )

    assert response.status_code == 200
    property_obj.refresh_from_db()
    assert property_obj.status == "AVAILABLE"


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

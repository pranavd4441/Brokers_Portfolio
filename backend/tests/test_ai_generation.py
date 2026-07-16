import json
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Tenant
from apps.properties.ai_service import PropertyAIService

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_setup():
    tenant = Tenant.objects.create(name="Nirman Real Estate", brand_color="#16c784")
    user = User.objects.create_user(
        email="test.agent@example.com",
        password="securepassword123",
        name="Test Agent",
        phone="+918888888888",
        tenant=tenant,
        role="BROKER",
    )
    return tenant, user


@pytest.mark.django_db
def test_ai_generation_endpoint_auth(api_client):
    """
    Ensure the generate-ai endpoint is protected by authentication.
    """
    url = "/api/properties/generate-ai/"
    response = api_client.post(url, {"raw_notes": "test"})
    assert response.status_code == 401


@pytest.mark.django_db
@patch("apps.properties.ai_service.PropertyAIService.generate")
def test_ai_generation_endpoint_success(mock_generate, api_client, test_setup):
    """
    Ensure authenticated users can generate AI content successfully.
    """
    tenant, user = test_setup
    api_client.force_authenticate(user=user)

    mock_data = {
        "title": "Stunning 3 BHK Apartment",
        "description": "Premium 3 BHK Apartment in Bandra West.",
        "headlines": ["Headline 1", "Headline 2"],
        "whatsapp_pitches": [
            {"type": "Warm / Friendly", "text": "Warm pitch"},
            {"type": "Professional / Formal", "text": "Formal pitch"},
            {"type": "Investor / Fact-focused", "text": "Investor pitch"},
        ],
    }
    mock_generate.return_value = mock_data

    url = "/api/properties/generate-ai/"
    payload = {
        "raw_notes": "3 BHK flat in Bandra West, price 3 Cr",
        "property_type": "APARTMENT",
        "price": "30000000",
        "bhk": "3",
        "area": "Bandra West",
        "city": "Mumbai",
    }
    response = api_client.post(url, payload, format="json")

    assert response.status_code == 200
    assert response.data["title"] == "Stunning 3 BHK Apartment"
    assert len(response.data["whatsapp_pitches"]) == 3
    mock_generate.assert_called_once_with(
        raw_notes="3 BHK flat in Bandra West, price 3 Cr",
        property_type="APARTMENT",
        price="30000000",
        bhk="3",
        area="Bandra West",
        city="Mumbai",
    )


@pytest.mark.django_db
def test_ai_generation_endpoint_missing_notes(api_client, test_setup):
    """
    Ensure validation error occurs when 'raw_notes' is missing.
    """
    tenant, user = test_setup
    api_client.force_authenticate(user=user)

    url = "/api/properties/generate-ai/"
    response = api_client.post(url, {}, format="json")
    assert response.status_code == 400
    assert "raw_notes" in response.data["detail"]


@pytest.mark.django_db
@patch("urllib.request.urlopen")
@patch("django.conf.settings.GEMINI_API_KEY", "fake_gemini_api_key_123")
def test_ai_service_gemini_success(mock_urlopen):
    """
    Test that the PropertyAIService parses the API response correctly when Gemini returns valid JSON.
    """
    mock_response = MagicMock()
    mock_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "title": "Beautiful Villa in Goa",
                                    "description": "Lovely 4 BHK Villa in Goa.",
                                    "headlines": [
                                        "Goa Villa Deal",
                                        "Premium 4 BHK Goa",
                                    ],
                                    "whatsapp_pitches": [
                                        {
                                            "type": "Warm / Friendly",
                                            "text": "Warm pitch text",
                                        },
                                        {
                                            "type": "Professional / Formal",
                                            "text": "Formal pitch text",
                                        },
                                        {
                                            "type": "Investor / Fact-focused",
                                            "text": "Investor pitch text",
                                        },
                                    ],
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }
    mock_response.read.return_value = json.dumps(mock_payload).encode("utf-8")
    mock_urlopen.return_value.__enter__.return_value = mock_response

    res = PropertyAIService.generate(
        raw_notes="4 BHK Villa in Goa near beach",
        property_type="VILLA",
        price="40000000",
        bhk="4",
        area="Anjuna",
        city="Goa",
    )

    assert res["title"] == "Beautiful Villa in Goa"
    assert res["description"] == "Lovely 4 BHK Villa in Goa."
    assert len(res["whatsapp_pitches"]) == 3


@pytest.mark.django_db
@patch("django.conf.settings.GEMINI_API_KEY", "")
def test_ai_service_fallback_system():
    """
    Test that the service correctly falls back to template generation when GEMINI_API_KEY is not configured.
    """
    res = PropertyAIService.generate(
        raw_notes="2 BHK flat in Pune with balcony",
        property_type="APARTMENT",
        price="6000000",
        bhk="2",
        area="Kalyani Nagar",
        city="Pune",
    )

    assert res["title"] == "2 BHK Apartment in Kalyani Nagar"
    assert "2 BHK Apartment in Kalyani Nagar" in res["description"]
    assert " balc" in res["description"].lower()
    assert len(res["headlines"]) == 5
    assert len(res["whatsapp_pitches"]) == 3
    assert res["whatsapp_pitches"][0]["type"] == "Warm / Friendly"

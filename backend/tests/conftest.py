import pytest


@pytest.fixture(autouse=True)
def override_settings(settings):
    """
    Auto-override settings for all tests to ensure local/test environment parity.
    Particularly, nullify TWILIO_AUTH_TOKEN to bypass webhook signature checks in test environment.
    """
    settings.TWILIO_AUTH_TOKEN = ""

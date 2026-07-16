import json
import logging
import uuid
from unittest.mock import patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.models import Tenant, User
from property_os.config import validate_environment
from property_os.feature_flags import FeatureFlagService
from property_os.logging import (
    JSONFormatter,
    clear_log_context,
    set_log_context,
)


@pytest.mark.django_db
class TestProductionReadiness:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.tenant, _ = Tenant.objects.get_or_create(
            name="Hardened Tenant", defaults={"brand_color": "#0F172A"}
        )
        self.user = User.objects.create_user(
            email="hardened@example.com",
            password="securepass123",
            name="Hardened User",
            tenant=self.tenant,
            role="OWNER",
        )
        from rest_framework_simplejwt.tokens import RefreshToken

        self.refresh = RefreshToken.for_user(self.user)
        self.refresh["tenant_id"] = str(self.tenant.id)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.refresh.access_token}"
        )

    def test_json_logging_format(self):
        clear_log_context()
        set_log_context("request_id", "test-req-123")
        set_log_context("tenant_id", "test-tenant-123")

        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="application",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Logging test message",
            args=(),
            exc_info=None,
        )

        formatted_str = formatter.format(record)
        log_json = json.loads(formatted_str)

        assert log_json["request_id"] == "test-req-123"
        assert log_json["tenant_id"] == "test-tenant-123"
        assert log_json["message"] == "Logging test message"
        assert log_json["level"] == "INFO"
        assert "timestamp" in log_json
        assert "worker_pid" in log_json
        clear_log_context()

    def test_request_id_middleware(self):
        # 1. Without supplying X-Request-ID header
        response = self.client.get("/api/health/")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        req_id = response.headers["X-Request-ID"]
        assert len(req_id) > 10

        # 2. Supplying X-Request-ID header
        client_req_id = str(uuid.uuid4())
        response = self.client.get("/api/health/", HTTP_X_REQUEST_ID=client_req_id)
        assert response.status_code == 200
        assert response.headers["X-Request-ID"] == client_req_id

    def test_security_headers(self):
        response = self.client.get("/api/health/")
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "Content-Security-Policy" in response.headers
        assert "Permissions-Policy" in response.headers
        assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"

    def test_health_check_upgrade(self):
        response = self.client.get("/api/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "details" in data
        assert "database" in data["details"]
        assert "migrations_pending" in data["details"]
        assert "storage" in data["details"]
        assert "response_time_ms" in data

    def test_global_exception_middleware(self):
        # Patch the HealthCheckView get method to raise an unhandled exception
        # and prevent the test client from raising the exception directly to pytest.
        self.client.raise_request_exception = False
        from property_os.urls import HealthCheckView

        with patch.object(
            HealthCheckView, "get", side_effect=Exception("Centralized crash test")
        ):
            response = self.client.get("/api/health/")
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "request_id" in data
            assert "Centralized crash test" not in data["detail"]

    def test_feature_flags_registration_disabled(self):
        # Disable registration via feature flag
        with patch.object(
            FeatureFlagService,
            "is_enabled",
            side_effect=lambda flag: False if flag == "ENABLE_REGISTRATION" else True,
        ):
            register_url = reverse("auth_register")
            data = {
                "email": "new_broker_test@example.com",
                "password": "brokerpassword123",
                "name": "New Broker",
                "agency_name": "Premium Estates",
            }
            # Clear client credentials for anonymous call
            self.client.credentials()
            response = self.client.post(register_url, data)
            assert response.status_code == 403
            assert (
                response.json()["detail"] == "User registration is currently disabled."
            )

    def test_rate_limiting_enforcement(self):
        login_url = reverse("auth_login")
        self.client.credentials()  # Clear headers

        with patch.object(AnonRateThrottle, "allow_request", return_value=False):
            with patch.object(AnonRateThrottle, "wait", return_value=60):
                response = self.client.post(
                    login_url,
                    {"email": "test@example.com", "password": "wrongpassword"},
                )
                assert response.status_code == 429
                assert "Retry-After" in response.headers

    def test_environment_validation_fail_fast(self):
        with patch.dict(
            "os.environ",
            {
                "DJANGO_ENVIRONMENT": "production",
                "DJANGO_SECRET_KEY": "django-insecure-key",
            },
        ):
            with pytest.raises(ImproperlyConfigured):
                validate_environment()

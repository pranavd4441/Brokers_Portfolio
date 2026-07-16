from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import (
    Tenant,
    UserSession,
)
from apps.accounts.password_validation import ComplexityValidator
from property_os.celery_hardening import idempotent_task

User = get_user_model()


@pytest.mark.django_db
class TestEnterpriseSecurity:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.tenant, _ = Tenant.objects.get_or_create(
            name="Enterprise Tenant", defaults={"brand_color": "#0F172A"}
        )
        self.user = User.objects.create_user(
            email="enterprise@example.com",
            password="EnterprisePassword123!",
            name="Enterprise Admin",
            tenant=self.tenant,
            role="OWNER",
        )

    def test_api_versioning_routing(self):
        # Verify both v1 path and legacy path respond
        response_v1 = self.client.get("/api/v1/health/")
        assert response_v1.status_code == 200

        response_legacy = self.client.get("/api/health/")
        assert response_legacy.status_code == 200

    def test_password_complexity_validator(self):
        validator = ComplexityValidator()

        # Missing uppercase
        with pytest.raises(ValidationError):
            validator.validate("password123!")

        # Missing lowercase
        with pytest.raises(ValidationError):
            validator.validate("PASSWORD123!")

        # Missing digit
        with pytest.raises(ValidationError):
            validator.validate("Password!")

        # Missing special character
        with pytest.raises(ValidationError):
            validator.validate("Password123")

        # Valid password passes
        validator.validate("Password123!")

    def test_password_history_saving_and_checking(self):
        # Initially there should be 1 password in history from creation
        assert self.user.password_histories.count() == 1

        # Change password
        self.user.set_password("NewPassword123!")
        self.user.save()

        # Should record second password in history
        assert self.user.password_histories.count() == 2

        # Test password history checking
        from django.contrib.auth.hashers import check_password

        histories = self.user.password_histories.all()
        assert any(
            check_password("NewPassword123!", h.password_hash) for h in histories
        )
        assert any(
            check_password("EnterprisePassword123!", h.password_hash) for h in histories
        )

    def test_user_session_tracking_on_login(self):
        login_url = reverse("auth_login")
        response = self.client.post(
            login_url,
            {"email": "enterprise@example.com", "password": "EnterprisePassword123!"},
            HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        )

        assert response.status_code == 200
        data = response.json()
        assert "refresh" in data

        # Verify UserSession is created
        session = UserSession.objects.filter(user=self.user).first()
        assert session is not None
        assert session.browser == "Chrome"
        assert session.os == "Windows"
        assert session.is_active is True

    def test_user_session_logout_endpoints(self):
        # Create active sessions
        s1 = UserSession.objects.create(
            user=self.user,
            token_jti="jti-1",
            browser="Chrome",
            os="Windows",
            is_active=True,
        )
        s2 = UserSession.objects.create(
            user=self.user,
            token_jti="jti-2",
            browser="Firefox",
            os="Linux",
            is_active=True,
        )

        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # List active sessions
        list_url = "/api/v1/auth/sessions/"
        response = self.client.get(list_url)
        assert response.status_code == 200
        assert len(response.json()) >= 2

        # Terminate specific session
        logout_url = f"/api/v1/auth/sessions/{s1.id}/logout/"
        response_logout = self.client.post(logout_url)
        assert response_logout.status_code == 200
        s1.refresh_from_db()
        assert s1.is_active is False

        # Logout other sessions
        logout_other_url = "/api/v1/auth/sessions/logout-other/"
        current_session = UserSession.objects.create(
            user=self.user,
            token_jti="jti-current",
            ip_address="127.0.0.1",
            user_agent="Firefox Testing",
            browser="Firefox",
            os="Linux",
            is_active=True,
        )
        response_other = self.client.post(
            logout_other_url, HTTP_USER_AGENT="Firefox Testing", REMOTE_ADDR="127.0.0.1"
        )
        assert response_other.status_code == 200
        s2.refresh_from_db()
        assert s2.is_active is False
        current_session.refresh_from_db()
        assert current_session.is_active is True

        # Logout all sessions
        logout_all_url = "/api/v1/auth/sessions/logout-all/"
        response_all = self.client.post(logout_all_url)
        assert response_all.status_code == 200
        current_session.refresh_from_db()
        assert current_session.is_active is False

    def test_mfa_verification_workflow(self):
        # Enable MFA on the user
        self.user.mfa_enabled = True
        self.user.mfa_secret = "KVKVEU2CHFJECSRK"
        self.user.mfa_type = "TOTP"
        self.user.save()

        # Perform login - should return MFA ticket
        login_url = reverse("auth_login")
        response = self.client.post(
            login_url,
            {"email": "enterprise@example.com", "password": "EnterprisePassword123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("mfa_required") is True
        ticket_id = data.get("ticket")
        assert ticket_id is not None

        # Try to verify with incorrect code
        verify_url = "/api/v1/auth/mfa/verify/"
        response_wrong = self.client.post(
            verify_url, {"ticket": ticket_id, "code": "111111"}
        )
        assert response_wrong.status_code == 400

        # Verify with valid code (mock TOTP verify)
        import pyotp

        with patch.object(pyotp.TOTP, "verify", return_value=True):
            response_ok = self.client.post(
                verify_url, {"ticket": ticket_id, "code": "123456"}
            )
            assert response_ok.status_code == 200
            assert "refresh" in response_ok.json()
            assert "access" in response_ok.json()

    def test_payload_limits_and_content_type_middleware(self):
        # Verify size limit middleware blocks massive payload
        response = self.client.post(
            "/api/v1/health/",
            "data",
            content_type="application/json",
            CONTENT_LENGTH="25000000",  # ~25MB
        )
        assert response.status_code == 413

        # Verify content type validation middleware blocks bad Content-Type on write
        response_bad_type = self.client.post(
            "/api/v1/auth/login/",
            {"email": "test@example.com"},
            content_type="text/plain",
        )
        assert response_bad_type.status_code == 415

    def test_celery_task_idempotency_decorator(self):
        call_count = 0

        @idempotent_task(lock_key_prefix="test_lock", expire=10)
        def my_task(x, y):
            nonlocal call_count
            call_count += 1
            return x + y

        res1 = my_task(10, 20)
        assert res1 == 30
        assert call_count == 1

        with patch("django.core.cache.cache.add", return_value=False) as mock_add:
            res2 = my_task(10, 20)
            assert res2 is None
            assert call_count == 1
            mock_add.assert_called_once()

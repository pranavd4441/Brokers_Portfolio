import pytest
import uuid
import time
import hashlib
import hmac
from unittest.mock import patch, MagicMock
from django.core.management import call_command
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework.views import APIView
from rest_framework.response import Response

from property_os.secrets.manager import get_secret
from property_os.encryption import FieldEncryptor, EncryptedCharField
from apps.accounts.quotas import QuotaService, PLAN_LIMITS
from apps.accounts.models import Tenant
from apps.audit.models import ImmutableAuditLog
from property_os.feature_flags import FeatureFlagService

User = get_user_model()

@pytest.mark.django_db
class TestEnterpriseHardening:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(
            name="Testing Workspace Plan Limit",
            subscription_plan="FREE"
        )
        self.user = User.objects.create_user(
            email="hardening@example.com",
            password="HardeningPassword123!",
            name="Hardening User",
            tenant=self.tenant,
            role="OWNER"
        )

    def test_secrets_manager_lazy_caching(self):
        with patch('property_os.secrets.factory.SecretProviderFactory.get_provider') as mock_factory:
            mock_provider = MagicMock()
            mock_provider.get_secret.return_value = "secret-cached-value"
            mock_factory.return_value = mock_provider
            
            # Reset cache in SecretsManager singleton
            from property_os.secrets.manager import _manager
            _manager.cache.clear()
            
            # Fetch 1
            val1 = get_secret("MY_KEY")
            assert val1 == "secret-cached-value"
            
            # Fetch 2 (should hit cache, get_secret on provider called only once)
            val2 = get_secret("MY_KEY")
            assert val2 == "secret-cached-value"
            mock_provider.get_secret.assert_called_once_with("MY_KEY", None)

    def test_sliding_window_rate_limiting_fallback(self):
        # Clear throttle caches
        cache.clear()
        
        # Override settings or mock cache connection
        from property_os.throttling import AdvancedRateThrottle
        throttle = AdvancedRateThrottle()
        throttle.rate = "3/minute"
        throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)
        
        request = MagicMock()
        request.user = self.user
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        view = MagicMock()
        
        # 3 requests allowed
        assert throttle.allow_request(request, view) is True
        assert throttle.allow_request(request, view) is True
        assert throttle.allow_request(request, view) is True
        
        # 4th request throttled
        assert throttle.allow_request(request, view) is False
        assert throttle.wait() > 0

    def test_sliding_window_blacklist_abuse(self):
        cache.clear()
        
        from property_os.throttling import AdvancedRateThrottle
        throttle = AdvancedRateThrottle()
        throttle.rate = "1/minute"
        throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)
        
        request = MagicMock()
        request.user = self.user
        request.META = {"REMOTE_ADDR": "192.168.1.1"}
        view = MagicMock()
        
        # 1st request passes
        assert throttle.allow_request(request, view) is True
        
        # Tracing 10 violations to activate auto-blacklist
        for _ in range(10):
            throttle.allow_request(request, view)
            
        # The IP must be blacklisted now
        assert cache.get("blacklist:ip:192.168.1.1") is True
        # Future requests fail immediately
        assert throttle.allow_request(request, view) is False

    def test_migration_safety_checks_command(self):
        # Trigger verify_migrations command - should exit with 0 in clean codebase
        try:
            call_command('verify_migrations')
        except SystemExit as e:
            assert e.code == 0

    def test_immutable_audit_log_hash_chain(self):
        # Clear existing logs
        ImmutableAuditLog.objects.all().delete()
        
        # Create records
        log1 = ImmutableAuditLog.objects.create(
            actor_email="admin@example.com",
            action="CREATE_PROPERTY",
            payload='{"id": "prop-1", "name": "Mansion"}'
        )
        log2 = ImmutableAuditLog.objects.create(
            actor_email="admin@example.com",
            action="UPDATE_PROPERTY",
            payload='{"id": "prop-1", "price": 5000000}'
        )
        
        # Verify hash link
        assert log2.previous_hash == log1.current_hash
        assert log1.previous_hash == "GENESIS_ROOT_HASH_POINTER"
        
        # Verification command passes on unmodified database
        try:
            call_command('verify_audit_log')
        except SystemExit as e:
            assert e.code == 0
            
        # Tamper log1 data and save directly bypass save override (update raw fields)
        ImmutableAuditLog.objects.filter(id=log1.id).update(payload='{"id": "prop-1", "name": "Hacked Mansion"}')
        
        # Command must fail due to integrity hash mismatch
        with pytest.raises(SystemExit) as exc_info:
            call_command('verify_audit_log')
        assert exc_info.value.code == 1

    def test_tenant_plan_quotas(self):
        # Plan FREE limits users count to 2 (PLAN_LIMITS['FREE']['users'])
        # Current user count on tenant is 1 (self.user)
        # Create second user - should pass
        u2 = User.objects.create_user(
            email="user2@example.com",
            password="Password123!",
            tenant=self.tenant
        )
        assert QuotaService.get_current_usage(self.tenant, 'users') == 2
        
        # Verify check_quota for third user raises PermissionDenied
        with pytest.raises(PermissionDenied):
            QuotaService.check_quota(self.tenant, 'users', count_to_add=1)

    def test_aes_orm_transparent_encryption_field(self):
        raw_val = "TwilioAuthSecretTokenKey123!"
        encrypted_val = FieldEncryptor.encrypt(raw_val)
        
        assert encrypted_val.startswith("enc_aes_256:")
        
        decrypted_val = FieldEncryptor.decrypt(encrypted_val)
        assert decrypted_val == raw_val
        
        # Test transparent ORM decrypt helper
        # Since we haven't added encrypted field directly on core models yet to maintain schema integrity,
        # we can verify the custom EncryptedCharField class properties directly
        field = EncryptedCharField(max_length=255)
        prep = field.get_prep_value(raw_val)
        assert prep.startswith("enc_aes_256:")
        
        from_db = field.from_db_value(prep, None, None)
        assert from_db == raw_val

    def test_progressive_feature_flags_targeting(self):
        # Whitelist override test
        with patch.dict('os.environ', {"FEATURE_OVERRIDE_ENABLE_WHATSAPP_USERS": str(self.user.id)}):
            assert FeatureFlagService.is_enabled("ENABLE_WHATSAPP", {"user_id": str(self.user.id)}) is True
            
        # Hashed percentage rollout test
        # Fix rollout setting to 50%
        with patch.dict('os.environ', {"FEATURE_ROLLOUT_ENABLE_WHATSAPP": "50"}):
            # Evaluate deterministic hash for tenant
            tenant1 = "c0840ee8-c2b6-455b-8012-32a2f8b50630"
            tenant2 = "a8b9f1d0-9943-4e89-8d76-f84eb63cf905"
            
            import hashlib
            h1 = int(hashlib.md5(f"{tenant1}:ENABLE_WHATSAPP".encode()).hexdigest(), 16) % 100  # nosec B324
            h2 = int(hashlib.md5(f"{tenant2}:ENABLE_WHATSAPP".encode()).hexdigest(), 16) % 100  # nosec B324
            
            res1 = FeatureFlagService.is_enabled("ENABLE_WHATSAPP", {"tenant_id": tenant1})
            res2 = FeatureFlagService.is_enabled("ENABLE_WHATSAPP", {"tenant_id": tenant2})
            
            # Each should match its hash boundary check
            assert res1 == (h1 < 50)
            assert res2 == (h2 < 50)

    def test_structured_error_api_exceptions(self):
        # Verify bad endpoint triggers formatted structured error
        response = self.client.get('/api/v1/auth/sessions/99999999-9999-9999-9999-999999999999/logout/')
        assert response.status_code == 401 # Unauthenticated
        
        data = response.json()
        assert data['success'] is False
        assert data['code'] == 'UNAUTHENTICATED'
        assert 'message' in data
        assert 'details' in data
        assert 'request_id' in data
        assert 'timestamp' in data
        assert 'documentation' in data

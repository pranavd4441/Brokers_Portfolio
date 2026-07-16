import os
import hashlib
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class FeatureFlagService:
    """
    Centralized enterprise feature flag service.
    Supports environment variables, percentage rollouts, tenant overrides, and role targeting.
    """
    
    @classmethod
    def is_enabled(cls, flag_name: str, context: dict = None) -> bool:
        """
        Check if a given feature flag is enabled for the provided context.
        Context can contain: 'user_id', 'tenant_id', 'role', 'city', 'country'.
        """
        # 1. Check direct override list for user/tenant (Kill switch / Whitelisting)
        if context:
            tenant_id = context.get('tenant_id')
            user_id = context.get('user_id')
            role = context.get('role')
            
            # Check explicit whitelist environment variable overrides
            # Example: FEATURE_OVERRIDE_ENABLE_WHATSAPP_TENANTS="uuid1,uuid2"
            whitelist_tenants = os.getenv(f"FEATURE_OVERRIDE_{flag_name}_TENANTS", "")
            if whitelist_tenants and tenant_id:
                if str(tenant_id) in [t.strip() for t in whitelist_tenants.split(',')]:
                    return True
                    
            whitelist_users = os.getenv(f"FEATURE_OVERRIDE_{flag_name}_USERS", "")
            if whitelist_users and user_id:
                if str(user_id) in [u.strip() for u in whitelist_users.split(',')]:
                    return True
                    
            # Check role-based constraints
            # Example: FEATURE_TARGET_ROLES_ENABLE_WHATSAPP="OWNER,ADMIN"
            target_roles = os.getenv(f"FEATURE_TARGET_ROLES_{flag_name}", "")
            if target_roles and role:
                if str(role).upper() in [r.strip().upper() for r in target_roles.split(',')]:
                    return True

        # 2. Check general environment variable toggle
        env_keys = [f"FEATURE_{flag_name}", flag_name]
        for key in env_keys:
            val = os.getenv(key)
            if val is not None:
                # If explicit false, it acts as a global kill switch
                if val.strip().lower() in ('false', '0', 'no'):
                    return False
                if val.strip().lower() in ('true', '1', 'yes'):
                    return True

        # 3. Check percentage-based progressive rollouts
        if context:
            # Deterministic bucket scoring between 0-99
            target_id = context.get('tenant_id') or context.get('user_id')
            if target_id:
                # Use MD5 to distribute identifiers evenly across [0, 99]
                hash_score = int(hashlib.md5(f"{target_id}:{flag_name}".encode()).hexdigest(), 16) % 100  # nosec B324
                
                # Fetch threshold percentage (e.g. FEATURE_ROLLOUT_ENABLE_WHATSAPP=20 for 20%)
                rollout_str = os.getenv(f"FEATURE_ROLLOUT_{flag_name}")
                if rollout_str:
                    try:
                        rollout_percent = int(rollout_str)
                        if hash_score < rollout_percent:
                            return True
                        else:
                            return False  # Target is excluded from this percentage segment
                    except ValueError:
                        pass

        # 4. Fallback to settings
        if hasattr(settings, flag_name):
            return bool(getattr(settings, flag_name))
            
        # 5. Default configurations
        defaults = {
            "ENABLE_WHATSAPP": True,
            "ENABLE_ANALYTICS": True,
            "ENABLE_AI": True,
            "ENABLE_PUBLIC_SHARING": True,
            "ENABLE_LEADS": True,
            "ENABLE_IMAGE_PROCESSING": True,
            "ENABLE_REGISTRATION": True,
            "ENABLE_EMAIL": True,
            "ENABLE_DEBUG_TOOLBAR": False,
            "ENABLE_CELERY": True,
        }
        
        return defaults.get(flag_name, False)

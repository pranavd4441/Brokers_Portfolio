import logging
from django.core.exceptions import PermissionDenied

logger = logging.getLogger(__name__)

PLAN_LIMITS = {
    'FREE': {
        'users': 2,
        'listings': 10,
        'storage_bytes': 100 * 1024 * 1024,  # 100MB
        'leads': 50,
        'api_requests_per_min': 60
    },
    'PRO': {
        'users': 5,
        'listings': 100,
        'storage_bytes': 1 * 1024 * 1024 * 1024,  # 1GB
        'leads': 500,
        'api_requests_per_min': 120
    },
    'TEAM': {
        'users': 20,
        'listings': 500,
        'storage_bytes': 10 * 1024 * 1024 * 1024,  # 10GB
        'leads': 5000,
        'api_requests_per_min': 300
    },
    'ENTERPRISE': {
        'users': 999999,
        'listings': 999999,
        'storage_bytes': 999999 * 1024 * 1024 * 1024,
        'leads': 999999,
        'api_requests_per_min': 10000
    }
}

class QuotaService:
    """
    Enterprise Quotas Manager for Tenant subscription boundaries.
    """
    @staticmethod
    def get_tenant_plan(tenant):
        if not tenant:
            return 'FREE'
        return getattr(tenant, 'subscription_plan', 'FREE') or 'FREE'

    @classmethod
    def check_quota(cls, tenant, resource_type, count_to_add=1):
        """
        Validates if resource usage exceeds the subscription plan limit.
        Raises PermissionDenied if the quota is exceeded.
        """
        if not tenant:
            return
            
        plan = cls.get_tenant_plan(tenant)
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['FREE'])
        
        limit_val = limits.get(resource_type)
        if limit_val is None:
            return
            
        current_usage = cls.get_current_usage(tenant, resource_type)
        
        if current_usage + count_to_add > limit_val:
            logger.warning(
                f"[Quota Enforcer] Tenant {tenant.id} blocked: Plan '{plan}' limit of {limit_val} "
                f"reached for resource '{resource_type}'. Current usage: {current_usage}."
            )
            raise PermissionDenied(
                f"Tenant subscription limit reached for resource '{resource_type}' under the '{plan}' plan. "
                f"Please upgrade to a higher tier."
            )

    @classmethod
    def get_current_usage(cls, tenant, resource_type):
        from django.contrib.auth import get_user_model
        from apps.properties.models import Property
        from apps.leads.models import Lead
        from django.db.models import Sum
        
        User = get_user_model()
        
        if resource_type == 'users':
            return User.objects.filter(tenant=tenant).count()
        elif resource_type == 'listings':
            return Property.objects.filter(tenant=tenant).count()
        elif resource_type == 'leads':
            return Lead.objects.filter(tenant=tenant).count()
        elif resource_type == 'storage_bytes':
            # Stub for storage bytes measurement of media files
            return 0
            
        return 0

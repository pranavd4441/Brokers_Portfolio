from django.db import models
from .tenant_context import get_current_tenant_id

class TenantQuerySet(models.QuerySet):
    """
    Custom queryset to enforce tenant-level constraints on bulk actions.
    """
    pass


class TenantManager(models.Manager):
    """
    Manager that automatically filters all queries by the active tenant ID
    found in the thread/request context.
    """
    def get_queryset(self):
        queryset = TenantQuerySet(self.model, using=self._db)
        tenant_id = get_current_tenant_id()
        if tenant_id:
            return queryset.filter(tenant_id=tenant_id)
            
        from .tenant_context import is_tenant_enforcement_active
        if is_tenant_enforcement_active():
            return queryset.none()
            
        return queryset


class TenantModel(models.Model):
    """
    Abstract base class for all models that must be isolated by Tenant.
    Automatically applies the TenantManager to enforce logical isolation.
    """
    tenant = models.ForeignKey(
        'accounts.Tenant', 
        on_delete=models.CASCADE,
        db_index=True
    )

    # Default manager automatically filters queries by tenant
    objects = TenantManager()
    
    # Unfiltered manager allows manual cross-tenant queries (e.g., admin, global tasks)
    objects_unfiltered = models.Manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # Auto-populate tenant_id from context if not explicitly set
        if not hasattr(self, 'tenant') or self.tenant_id is None:
            tenant_id = get_current_tenant_id()
            if tenant_id:
                self.tenant_id = tenant_id
        super().save(*args, **kwargs)

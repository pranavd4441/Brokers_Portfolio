from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Lead
from .serializers import LeadSerializer
from apps.audit.utils import log_audit_event

class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing leads.
    Automatically isolated by Tenant via TenantModel and thread-local context.
    """
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Ensure tenant context is set from the authenticated user during DRF requests
        from apps.accounts.tenant_context import set_current_tenant_id
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
                set_current_tenant_id(str(request.user.tenant_id))

    def get_queryset(self):
        # Lead.objects automatically filters by the active tenant ID in thread context
        return Lead.objects.all()

    def perform_create(self, serializer):
        # Automatically associate lead with the current user's tenant
        lead_obj = serializer.save(
            tenant=self.request.user.tenant
        )
        log_audit_event(self.request.user, 'CREATE', lead_obj)

    def perform_update(self, serializer):
        lead_obj = serializer.save()
        log_audit_event(self.request.user, 'UPDATE', lead_obj)

    def perform_destroy(self, instance):
        log_audit_event(self.request.user, 'DELETE', instance)
        instance.delete()

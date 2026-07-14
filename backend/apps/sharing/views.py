from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from django.utils import timezone
from .models import ShareLink
from .serializers import ShareLinkSerializer
from apps.properties.models import Property
from apps.properties.serializers import PropertySerializer
from apps.accounts.serializers import TenantSerializer
from apps.audit.utils import log_audit_event

class ShareLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing broker share links.
    Isolated by Tenant.
    """
    serializer_class = ShareLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Ensure tenant context is set from the authenticated user during DRF requests
        from apps.accounts.tenant_context import set_current_tenant_id
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
                set_current_tenant_id(str(request.user.tenant_id))

    def get_queryset(self):
        return ShareLink.objects.all()

    def perform_create(self, serializer):
        link = serializer.save(
            created_by=self.request.user,
            tenant=self.request.user.tenant
        )
        # Log audit trail for sharing the property
        log_audit_event(
            self.request.user, 
            'SHARE', 
            link.property, 
            {"slug": link.slug, "share_link_id": str(link.id)}
        )


from property_os.throttling import PublicRateThrottle
from property_os.feature_flags import FeatureFlagService

class PublicPropertyResolverView(generics.RetrieveAPIView):
    """
    Public (zero-auth) endpoint to resolve a short slug.
    Returns the associated Property details and Tenant branding details.
    Uses objects_unfiltered because the visitor has no tenant_id context.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicRateThrottle]

    def retrieve(self, request, slug=None, *args, **kwargs):
        if not FeatureFlagService.is_enabled("ENABLE_PUBLIC_SHARING"):
            return Response(
                {"detail": "Public sharing is currently disabled."},
                status=status.HTTP_403_FORBIDDEN
            )
        # 1. Look up the share link using unfiltered manager
        try:
            share_link = ShareLink.objects_unfiltered.select_related(
                'property', 'tenant', 'created_by'
            ).get(slug=slug)
            
            # 2. Check for link expiry
            if share_link.expiry and share_link.expiry < timezone.now():
                return Response(
                    {"detail": "This sharing link has expired."}, 
                    status=status.HTTP_410_GONE
                )
            
            property_obj = share_link.property
            tenant_obj = share_link.tenant
            broker_user = share_link.created_by
        except ShareLink.DoesNotExist:
            # Fallback: check if slug is actually a property ID
            try:
                property_obj = Property.objects_unfiltered.select_related('tenant', 'created_by', 'assigned_to').get(id=slug)
                tenant_obj = property_obj.tenant
                broker_user = property_obj.created_by or property_obj.assigned_to
            except (Property.DoesNotExist, ValueError):
                return Response(
                    {"detail": "This listing link is invalid or has been removed."}, 
                    status=status.HTTP_404_NOT_FOUND
                )

        # 4. Serialize property
        property_serializer = PropertySerializer(property_obj)
        tenant_serializer = TenantSerializer(tenant_obj)

        # Retrieve views count from AnalyticsEvent
        from apps.analytics.models import AnalyticsEvent
        view_count = AnalyticsEvent.objects.filter(
            property=property_obj,
            event_type='PAGE_VIEW'
        ).count()

        # Inject views count into serialized data
        property_data = property_serializer.data
        property_data['views'] = view_count

        # 5. Build broker info from the share link creator (user) + tenant fallback
        broker_name = tenant_obj.name
        broker_phone = tenant_obj.whatsapp_default_number or ''
        broker_whatsapp = tenant_obj.whatsapp_default_number or ''
        broker_verified = False

        if broker_user:
            broker_name = broker_user.name or tenant_obj.name
            # Use broker's phone; fall back to tenant's WhatsApp number
            broker_phone = broker_user.phone or tenant_obj.whatsapp_default_number or ''
            broker_whatsapp = broker_user.phone or tenant_obj.whatsapp_default_number or ''
            broker_verified = True

        payload = {
            "property": property_data,
            "branding": {
                **tenant_serializer.data,
                "broker_name": broker_name,
                "phone": broker_phone,
                "whatsapp": broker_whatsapp,
                "verified": broker_verified,
            }
        }

        return Response(payload, status=status.HTTP_200_OK)

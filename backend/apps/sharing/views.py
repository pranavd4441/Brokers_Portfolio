from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response

from apps.accounts.serializers import TenantSerializer
from apps.audit.utils import log_audit_event
from apps.properties.serializers import PropertySerializer

from .models import ShareLink
from .serializers import ShareLinkSerializer


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
            if hasattr(request.user, "tenant_id") and request.user.tenant_id:
                set_current_tenant_id(str(request.user.tenant_id))

    def get_queryset(self):
        return ShareLink.objects.all()

    def create(self, request, *args, **kwargs):
        """Return one stable public URL while counting each broker share action."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        property_obj = serializer.validated_data["property"]

        link = self.get_queryset().filter(property=property_obj).first()
        created = link is None
        if created:
            link = serializer.save(
                created_by=request.user,
                tenant=request.user.tenant,
            )

        from django.db.models import F

        from apps.accounts.models import Tenant

        Tenant.objects.filter(pk=request.user.tenant_id).update(
            share_actions_count=F("share_actions_count") + 1
        )

        log_audit_event(
            request.user,
            "SHARE",
            property_obj,
            {"slug": link.slug, "share_link_id": str(link.id)},
        )

        response_serializer = self.get_serializer(link)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


from property_os.feature_flags import FeatureFlagService
from property_os.throttling import PublicRateThrottle


class PublicPropertyResolverView(generics.RetrieveAPIView):
    """
    Public (zero-auth) endpoint to resolve a short slug.
    Returns the associated Property details and Tenant branding details.
    Uses objects_unfiltered because the visitor has no tenant_id context.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicRateThrottle]
    public_statuses = {"AVAILABLE", "NEGOTIATION", "SITE_VISIT", "BOOKED"}

    def retrieve(self, request, slug=None, *args, **kwargs):
        if not FeatureFlagService.is_enabled("ENABLE_PUBLIC_SHARING"):
            return Response(
                {"detail": "Public sharing is currently disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            share_link = ShareLink.objects_unfiltered.select_related(
                "property", "tenant", "created_by"
            ).get(slug=slug)
        except ShareLink.DoesNotExist:
            return Response(
                {"detail": "This listing link is invalid or has been removed."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if share_link.expiry and share_link.expiry < timezone.now():
            return Response(
                {"detail": "This sharing link has expired."},
                status=status.HTTP_410_GONE,
            )

        property_obj = share_link.property
        if property_obj.status not in self.public_statuses:
            return Response(
                {"detail": "This listing is no longer available publicly."},
                status=status.HTTP_410_GONE,
            )

        tenant_obj = share_link.tenant
        broker_user = share_link.created_by

        # 4. Serialize property
        property_serializer = PropertySerializer(
            property_obj, context={"request": request}
        )
        tenant_serializer = TenantSerializer(tenant_obj, context={"request": request})

        # Retrieve views count from AnalyticsEvent
        from apps.analytics.models import AnalyticsEvent

        view_count = AnalyticsEvent.objects.filter(
            property=property_obj, event_type="PAGE_VIEW"
        ).count()

        # Inject views count into serialized data
        property_data = property_serializer.data
        property_data["views"] = view_count
        # Public pages disclose only the broker-provided locality. Exact address
        # and directions are shared by the broker after a buyer enquires.
        property_data["location_address"] = None
        # Original imports can contain owner numbers, exact addresses and private
        # broker notes. Only the reviewed listing content belongs on public pages.
        property_data.pop("intake_metadata", None)

        # 5. Build broker info from the share link creator (user) + tenant fallback
        broker_name = tenant_obj.name
        broker_phone = tenant_obj.whatsapp_default_number or ""
        broker_whatsapp = tenant_obj.whatsapp_default_number or ""
        broker_verified = False

        if broker_user:
            broker_name = broker_user.name or tenant_obj.name
            # Use broker's phone; fall back to tenant's WhatsApp number
            broker_phone = broker_user.phone or tenant_obj.whatsapp_default_number or ""
            broker_whatsapp = (
                broker_user.phone or tenant_obj.whatsapp_default_number or ""
            )
            broker_verified = True

        payload = {
            "property": property_data,
            "branding": {
                **tenant_serializer.data,
                "broker_name": broker_name,
                "phone": broker_phone,
                "whatsapp": broker_whatsapp,
                "verified": broker_verified,
            },
        }

        return Response(payload, status=status.HTTP_200_OK)

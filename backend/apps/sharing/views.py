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


class PublicPropertyResolverView(generics.RetrieveAPIView):
    """
    Public (zero-auth) endpoint to resolve a short slug.
    Returns the associated Property details and Tenant branding details.
    Uses objects_unfiltered because the visitor has no tenant_id context.
    """
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, slug=None, *args, **kwargs):
        # 1. Look up the share link using unfiltered manager
        try:
            share_link = ShareLink.objects_unfiltered.select_related('property', 'tenant').get(slug=slug)
        except ShareLink.DoesNotExist:
            return Response(
                {"detail": "This listing link is invalid or has been removed."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Check for link expiry
        if share_link.expiry and share_link.expiry < timezone.now():
            return Response(
                {"detail": "This sharing link has expired."}, 
                status=status.HTTP_410_GONE
            )

        # 3. Retrieve property (unfiltered since it's a public share)
        property_obj = share_link.property
        tenant_obj = share_link.tenant

        # 4. Serialize models
        property_serializer = PropertySerializer(property_obj)
        tenant_serializer = TenantSerializer(tenant_obj)

        payload = {
            "property": property_serializer.data,
            "branding": tenant_serializer.data
        }

        return Response(payload, status=status.HTTP_200_OK)

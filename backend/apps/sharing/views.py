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
            share_link = ShareLink.objects_unfiltered.select_related('property', 'tenant', 'property__created_by').get(slug=slug)
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
        
        prop_data = property_serializer.data
        brand_data = tenant_serializer.data
        owner = property_obj.created_by

        # Build the flat PublicProperty structure expected by PublicPropertyClient.tsx
        payload = {
            "id": property_obj.id,
            "slug": slug,
            "title": property_obj.title,
            "description": property_obj.description,
            "price": float(property_obj.price),
            "property_type": property_obj.property_type,
            "status": property_obj.status,
            "city": property_obj.city,
            "area": property_obj.area,
            "address": property_obj.location_address,
            "bhk": property_obj.bhk,
            "square_feet": float(property_obj.square_feet) if property_obj.square_feet else None,
            "amenities": property_obj.amenities,
            "images": prop_data.get("images", []),
            "broker": {
                "name": owner.name if owner else "Agent",
                "phone": owner.phone if (owner and owner.phone) else (brand_data.get("whatsapp_default_number") or ""),
                "whatsapp": brand_data.get("whatsapp_default_number") or (owner.phone if owner else ""),
                "avatar_url": None,
                "agency_name": brand_data.get("name"),
                "verified": True
            },
            "brand_color": brand_data.get("brand_color", "#16c784"),
            "brand_logo_url": brand_data.get("logo_url"),
            "agency_name": brand_data.get("name"),
            "views": 0
        }

        return Response(payload, status=status.HTTP_200_OK)

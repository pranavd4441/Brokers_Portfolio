import tempfile
from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Property
from .serializers import PropertySerializer
from apps.media.models import PropertyImage
from apps.media.utils import process_and_store_image
from apps.media.tasks import process_image_async
from apps.audit.utils import log_audit_event
from property_os.feature_flags import FeatureFlagService

class PropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing property listings.
    Automatically isolated by Tenant via TenantModel.
    """
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Ensure tenant context is set from the authenticated user during DRF requests
        from apps.accounts.tenant_context import set_current_tenant_id
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
                set_current_tenant_id(str(request.user.tenant_id))

    def get_queryset(self):
        # Property.objects automatically filters by the active tenant ID in thread context
        # Optimized to select owner/tenant relationships and prefetch images/share_links to resolve N+1 queries
        return Property.objects.select_related(
            'created_by', 'assigned_to', 'tenant'
        ).prefetch_related(
            'images', 'share_links'
        )

    def perform_create(self, serializer):
        # Automatically associate listing with the current user and their tenant
        property_obj = serializer.save(
            created_by=self.request.user,
            tenant=self.request.user.tenant
        )
        # Log audit trail
        log_audit_event(self.request.user, 'CREATE', property_obj)

    def perform_update(self, serializer):
        # Capture old values for audit logging
        original_property = self.get_object()
        old_price = original_property.price
        old_status = original_property.status
        old_title = original_property.title

        property_obj = serializer.save()

        # Build changes payload
        changes = {}
        if old_price != property_obj.price:
            changes['price'] = {"old": float(old_price), "new": float(property_obj.price)}
        if old_status != property_obj.status:
            changes['status'] = {"old": old_status, "new": property_obj.status}
        if old_title != property_obj.title:
            changes['title'] = {"old": old_title, "new": property_obj.title}

        # Log audit trail if changes occurred
        if changes:
            log_audit_event(self.request.user, 'UPDATE', property_obj, changes)

    def perform_destroy(self, instance):
        # Log audit trail before deleting
        log_audit_event(self.request.user, 'DELETE', instance)
        super().perform_destroy(instance)

    @decorators.action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Custom action to clone an existing property listing.
        Duplicates metadata and creates new copies of associated image records.
        """
        original_property = self.get_object()
        
        with transaction.atomic():
            # Clone the property instance
            cloned_property = Property.objects.create(
                tenant=original_property.tenant,
                created_by=request.user,
                title=f"Copy of {original_property.title}",
                description=original_property.description,
                price=original_property.price,
                property_type=original_property.property_type,
                status='AVAILABLE',  # Default to available for the clone
                city=original_property.city,
                area=original_property.area,
                location_address=original_property.location_address,
                bhk=original_property.bhk,
                square_feet=original_property.square_feet,
                amenities=original_property.amenities
            )

            # Duplicate images
            original_images = original_property.images.all()
            for img in original_images:
                PropertyImage.objects.create(
                    property=cloned_property,
                    url=img.url,
                    thumbnail_url=img.thumbnail_url,
                    display_order=img.display_order
                )
            
            # Log audit trail for the clone action
            log_audit_event(
                request.user, 
                'CREATE', 
                cloned_property, 
                {"duplicated_from": str(original_property.id)}
            )

        serializer = self.get_serializer(cloned_property)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @decorators.action(
        detail=True, 
        methods=['post'], 
        parser_classes=[MultiPartParser, FormParser],
        url_path='images'
    )
    def upload_images(self, request, pk=None):
        """
        Upload and associate multiple images to a property.
        Supports both synchronous processing (default) and async offloading.
        """
        if not FeatureFlagService.is_enabled("ENABLE_IMAGE_PROCESSING"):
            return Response(
                {"detail": "Image processing features are currently disabled."},
                status=status.HTTP_403_FORBIDDEN
            )

        property_obj = self.get_object()
        uploaded_files = request.FILES.getlist('images')
        
        if not uploaded_files:
            return Response(
                {"detail": "No image files were provided."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        created_images = []
        async_processing = request.query_params.get('async', 'false').lower() == 'true'
        if async_processing and not FeatureFlagService.is_enabled("ENABLE_CELERY"):
            # Fall back to synchronous in-request processing if Celery is disabled
            async_processing = False


        # Get the starting display order
        last_img = property_obj.images.order_by('-display_order').first()
        start_order = (last_img.display_order + 1) if last_img else 0

        for idx, file_obj in enumerate(uploaded_files):
            display_order = start_order + idx
            
            if async_processing:
                # 1. Asynchronous processing via Celery (In-Memory base64)
                import base64
                file_bytes = file_obj.read()
                base64_data = base64.b64encode(file_bytes).decode('utf-8')
                
                # Dispatch task to Celery worker in memory (no shared file paths)
                process_image_async.delay(
                    str(property_obj.id),
                    base64_data,
                    file_obj.name,
                    display_order
                )
            else:
                # 2. Synchronous processing in-request
                try:
                    main_url, thumb_url = process_and_store_image(str(property_obj.id), file_obj)
                    img_record = PropertyImage.objects.create(
                        property=property_obj,
                        url=main_url,
                        thumbnail_url=thumb_url,
                        display_order=display_order
                    )
                    created_images.append(img_record)
                except Exception as e:
                    return Response(
                        {"detail": f"Failed to process image {file_obj.name}: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

        if async_processing:
            # Log audit trail for image uploads (bulk background trigger)
            log_audit_event(
                request.user, 
                'UPDATE', 
                property_obj, 
                {"images_queued_count": len(uploaded_files)}
            )
            return Response(
                {"detail": f"{len(uploaded_files)} images queued for background processing."},
                status=status.HTTP_202_ACCEPTED
            )

        # Log audit trail for synchronous image uploads
        log_audit_event(
            request.user, 
            'UPDATE', 
            property_obj, 
            {"images_uploaded_count": len(created_images)}
        )

        # Return the newly created images
        from .serializers import PropertyImageSerializer
        serializer = PropertyImageSerializer(created_images, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @decorators.action(
        detail=True, 
        methods=['delete'], 
        url_path='images/(?P<image_id>[^/.]+)'
    )
    def delete_image(self, request, pk=None, image_id=None):
        """
        Delete a specific image associated with a property.
        """
        property_obj = self.get_object()
        image_obj = get_object_or_404(PropertyImage, property=property_obj, id=image_id)
        image_obj.delete()
        log_audit_event(request.user, 'UPDATE', property_obj, {"deleted_image_id": str(image_id)})
        return Response(status=status.HTTP_204_NO_CONTENT)

    @decorators.action(detail=False, methods=['post'], url_path='generate-ai')
    def generate_ai(self, request):
        """
        Uses Gemini to generate property title, description, headlines, and WhatsApp pitches
        based on raw input text/bullet points and key metadata features.
        """
        if not FeatureFlagService.is_enabled("ENABLE_AI"):
            return Response(
                {"detail": "AI features are currently disabled."},
                status=status.HTTP_403_FORBIDDEN
            )

        raw_notes = request.data.get('raw_notes')
        if not raw_notes:
            return Response(
                {"detail": "The 'raw_notes' field is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        property_type = request.data.get('property_type', 'APARTMENT')
        price = request.data.get('price')
        bhk = request.data.get('bhk')
        area = request.data.get('area')
        city = request.data.get('city')

        from .ai_service import PropertyAIService
        data = PropertyAIService.generate(
            raw_notes=raw_notes,
            property_type=property_type,
            price=price,
            bhk=bhk,
            area=area,
            city=city
        )
        return Response(data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=['get'], url_path='brochure')
    def brochure(self, request, pk=None):
        """
        Generates and returns the URL to download a premium PDF brochure for the property.
        """
        property_obj = self.get_object()  # ensures the object belongs to the tenant
        
        # Trigger task execution
        from .tasks import generate_brochure_pdf_task
        saved_path = generate_brochure_pdf_task(property_obj.id)
        
        if not saved_path:
            return Response(
                {"detail": "Failed to generate property brochure."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        # Get absolute storage URL
        from django.core.files.storage import default_storage
        file_url = default_storage.url(saved_path)
        absolute_url = request.build_absolute_uri(file_url)
        
        # Log audit trail for brochure download
        log_audit_event(request.user, 'VIEW', property_obj, {"action": "download_brochure"})
        
        return Response({"brochure_url": absolute_url}, status=status.HTTP_200_OK)




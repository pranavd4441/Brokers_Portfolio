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

class PropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing property listings.
    Automatically isolated by Tenant via TenantModel.
    """
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Property.objects automatically filters by the active tenant ID in thread context
        return Property.objects.all()

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
        property_obj = self.get_object()
        uploaded_files = request.FILES.getlist('images')
        
        if not uploaded_files:
            return Response(
                {"detail": "No image files were provided."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        created_images = []
        async_processing = request.query_params.get('async', 'false').lower() == 'true'

        # Get the starting display order
        last_img = property_obj.images.order_by('-display_order').first()
        start_order = (last_img.display_order + 1) if last_img else 0

        for idx, file_obj in enumerate(uploaded_files):
            display_order = start_order + idx
            
            if async_processing:
                # 1. Asynchronous processing via Celery
                # Save file to a temporary location
                temp_dir = tempfile.gettempdir()
                temp_file_suffix = f"_{file_obj.name}"
                with tempfile.NamedTemporaryFile(dir=temp_dir, suffix=temp_file_suffix, delete=False) as temp_file:
                    for chunk in file_obj.chunks():
                        temp_file.write(chunk)
                    temp_path = temp_file.name
                
                # Dispatch task to Celery worker
                process_image_async.delay(str(property_obj.id), temp_path, display_order)
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

import os
from celery import shared_task
from django.contrib.auth import get_user_model
from apps.properties.models import Property
from .models import PropertyImage
from .utils import process_and_store_image

@shared_task
def process_image_async(property_id, base64_data, filename, display_order):
    """
    Celery task to process and optimize an uploaded image asynchronously in-memory:
    1. Decodes the base64 image data.
    2. Runs the image optimization and uploads to R2/S3.
    3. Saves the metadata to the PropertyImage table.
    """
    import base64
    from io import BytesIO
    try:
        # Get the property
        try:
            property_obj = Property.objects_unfiltered.get(id=property_id)
        except Property.DoesNotExist:
            print(f"[Celery] Property {property_id} does not exist.")
            return False

        # Process and store in memory
        file_bytes = base64.b64decode(base64_data)
        f = BytesIO(file_bytes)
        # Pillow needs name attribute sometimes, we can wrap or pass directly
        # Let's set the name on the BytesIO object so utils can inspect file extensions if needed
        f.name = filename
        
        main_url, thumb_url = process_and_store_image(property_id, f)

        # Write to database
        PropertyImage.objects.create(
            property=property_obj,
            url=main_url,
            thumbnail_url=thumb_url,
            display_order=display_order
        )

        print(f"[Celery] Successfully processed image for property {property_id}")
        return True

    except Exception as e:
        print(f"[Celery] Error processing image: {str(e)}")
        return False

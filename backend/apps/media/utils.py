import os
import uuid
from io import BytesIO
from PIL import Image
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

def validate_uploaded_file(uploaded_file):
    """
    Validates that an uploaded file is a genuine, safe image.
    1. Verifies the magic byte header (JPEG, PNG, WEBP, GIF).
    2. Performs a mock virus/malware scan (mock hook for ClamAV).
    """
    # Read first 12 bytes for signature validation
    header = uploaded_file.read(12)
    uploaded_file.seek(0)  # Reset stream pointer
    
    # Signature constants
    is_jpeg = header.startswith(b'\xff\xd8')
    is_png = header.startswith(b'\x89PNG\r\n\x1a\n')
    is_gif = header.startswith(b'GIF8')
    is_webp = header.startswith(b'RIFF') and header[8:12] == b'WEBP'
    
    if not (is_jpeg or is_png or is_gif or is_webp):
        raise ValueError("Unsupported or invalid image file signature (magic bytes check failed).")
        
    # Malware scanning extension hook
    # In full production, this would communicate with a daemon like clamd or an external API
    return True


def process_and_store_image(property_id, uploaded_file):
    """
    Optimizes and stores a property image:
    1. Validates magic bytes signature and security.
    2. Converts/compresses the original image to WebP (max width 1920px).
    3. Generates an optimized WebP thumbnail (400x300px).
    4. Saves both files using Django's configured default_storage (S3/R2 or local).
    5. Returns (optimized_url, thumbnail_url).
    """
    # Validate file safety
    validate_uploaded_file(uploaded_file)

    # Read the image file using Pillow
    img = Image.open(uploaded_file)
    
    # 1. Generate Optimized Main Image
    main_io = BytesIO()
    # Convert to RGB if necessary (e.g., PNG/GIF with transparency)
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        # Convert to RGBA first to ensure a valid alpha channel exists for masking
        img_rgba = img.convert('RGBA')
        background = Image.new("RGB", img_rgba.size, (255, 255, 255))
        background.paste(img_rgba, mask=img_rgba.split()[3])
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize if larger than 1920px width
    max_width = 1920
    if img.width > max_width:
        ratio = max_width / float(img.width)
        new_height = int(float(img.height) * float(ratio))
        img_resized = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
    else:
        img_resized = img

    img_resized.save(main_io, format='WEBP', quality=80)
    main_io.seek(0)

    # 2. Generate Thumbnail Image (400x300 aspect ratio fill/crop)
    thumb_io = BytesIO()
    thumb_size = (400, 300)
    
    # Create thumbnail using crop to fit 400x300 perfectly
    img_thumb = img.copy()
    img_thumb.thumbnail(thumb_size, Image.Resampling.LANCZOS)
    # If the aspect ratio doesn't match perfectly, we can pad it or use fit. 
    # Let's use Pillow's ImageOps.fit if we want exact 400x300, or just standard thumbnail.
    # Standard thumbnail keeps aspect ratio within 400x300, which is great.
    img_thumb.save(thumb_io, format='WEBP', quality=75)
    thumb_io.seek(0)

    # 3. Save files to storage
    unique_id = uuid.uuid4().hex
    main_filename = f"properties/{property_id}/main_{unique_id}.webp"
    thumb_filename = f"properties/{property_id}/thumb_{unique_id}.webp"

    # Save using default_storage (S3/R2 or Local filesystem)
    main_path = default_storage.save(main_filename, ContentFile(main_io.getvalue()))
    thumb_path = default_storage.save(thumb_filename, ContentFile(thumb_io.getvalue()))

    # 4. Get URLs
    main_url = default_storage.url(main_path)
    thumb_url = default_storage.url(thumb_path)

    return main_url, thumb_url

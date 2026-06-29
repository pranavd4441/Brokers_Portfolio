import io
from celery import shared_task
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from xhtml2pdf import pisa
from .models import Property

@shared_task
def generate_brochure_pdf_task(property_id):
    """
    Asynchronous task compiling property details, photos, and tenant branding
    into a premium HTML template, rendering to a PDF, and saving it to default storage.
    """
    try:
        # Use unfiltered objects because the Celery thread context won't have request tenant ID
        property_obj = Property.objects_unfiltered.get(id=property_id)
    except (Property.DoesNotExist, ValueError, TypeError):
        return None

    # Get logo/brand parameters
    tenant = property_obj.tenant
    brand_color = tenant.brand_color or "#16c784"
    tenant_name = tenant.name

    # Determine primary image path
    image_src = None
    if property_obj.images.exists():
        first_image = property_obj.images.first()
        url_str = first_image.url
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        if url_str.startswith(media_url):
            relative_path = url_str.replace(media_url, '', 1)
            try:
                image_src = default_storage.path(relative_path)
            except NotImplementedError:
                # remote storage (R2/S3) doesn't implement path(); use absolute URL directly
                image_src = url_str
        else:
            image_src = url_str

    # Format price display
    price = property_obj.price
    if price >= 10000000:
        price_str = f"₹{float(price / 10000000):.2f} Cr"
    elif price >= 100000:
        price_str = f"₹{float(price / 100000):.2f} L"
    else:
        price_str = f"₹{int(price):,}"

    # Construct context
    context = {
        'property': property_obj,
        'brand_color': brand_color,
        'tenant_name': tenant_name,
        'image_src': image_src,
        'price_str': price_str,
        'property_type_label': property_obj.get_property_type_display(),
    }

    # Render HTML template
    html_content = render_to_string('properties/brochure.html', context)

    # Compile HTML to PDF via Pisa
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)

    if pisa_status.err:
        raise Exception(f"Pisa PDF conversion failed with {pisa_status.err} errors.")

    # Save PDF file to storage
    pdf_filename = f"brochures/brochure_{property_id}.pdf"
    
    # Clean previous if exists
    if default_storage.exists(pdf_filename):
        default_storage.delete(pdf_filename)
        
    saved_path = default_storage.save(pdf_filename, ContentFile(pdf_buffer.getvalue()))
    return saved_path

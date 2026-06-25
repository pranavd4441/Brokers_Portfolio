import uuid
import random
import string
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from apps.accounts.tenant_models import TenantModel

def generate_default_slug(title=None):
    """
    Generates a unique short slug for sharing.
    Example: 'sleek-3-bhk-baner-x7f2a1'
    """
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    if title:
        base = slugify(title)[:40]
        if base:
            return f"{base}-{suffix}"
    return suffix


class ShareLink(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        'properties.Property', 
        on_delete=models.CASCADE, 
        related_name='share_links'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    slug = models.CharField(max_length=100, unique=True, db_index=True)
    expiry = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Generate automatic slug if not provided
        if not self.slug:
            # We try to use the property title if already loaded, 
            # else fall back to a random slug.
            title = self.property.title if hasattr(self, 'property') and self.property else None
            self.slug = generate_default_slug(title)
            
            # Ensure slug uniqueness in case of collision
            while ShareLink.objects_unfiltered.filter(slug=self.slug).exists():
                self.slug = generate_default_slug(title)
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Slug: {self.slug} for Property: {self.property_id}"

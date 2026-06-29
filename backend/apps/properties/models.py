from django.db import models
from django.conf import settings
from apps.accounts.tenant_models import TenantModel

class Property(TenantModel):
    PROPERTY_TYPES = (
        ('APARTMENT', 'Apartment / Flat'),
        ('VILLA', 'Villa / House'),
        ('PLOT', 'Land / Plot'),
        ('COMMERCIAL', 'Commercial Space'),
    )

    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('NEGOTIATION', 'In Negotiation'),
        ('SITE_VISIT', 'Site Visit Scheduled'),
        ('BOOKED', 'Booked / Token Received'),
        ('SOLD', 'Sold / Closed'),
        ('EXPIRED', 'Expired / Delisted'),
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='properties'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_properties'
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    views_count = models.IntegerField(default=0)
    leads_count = models.IntegerField(default=0)
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=15, decimal_places=2)
    property_type = models.CharField(max_length=50, choices=PROPERTY_TYPES, default='APARTMENT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    
    city = models.CharField(max_length=100)
    area = models.CharField(max_length=100)
    location_address = models.TextField(blank=True, null=True)
    
    bhk = models.IntegerField(blank=True, null=True)
    square_feet = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    amenities = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Properties"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.city} - {self.price}"

    def save(self, *args, **kwargs):
        from django.utils import timezone
        from datetime import timedelta
        
        # Auto-populate expires_at on creation if not set
        if not self.pk and not self.expires_at:
            expiry_days = 30
            # Since TenantModel's save() handles tenant context, we can check get_current_tenant_id()
            # or self.tenant directly if set
            from apps.accounts.tenant_context import get_current_tenant_id
            from apps.accounts.models import Tenant
            
            tenant_id = getattr(self, 'tenant_id', None) or get_current_tenant_id()
            if tenant_id:
                try:
                    tenant_obj = Tenant.objects.get(id=tenant_id)
                    expiry_days = tenant_obj.listing_expiry_days
                except Tenant.DoesNotExist:
                    pass
            
            self.expires_at = timezone.now() + timedelta(days=expiry_days)
            
        super().save(*args, **kwargs)

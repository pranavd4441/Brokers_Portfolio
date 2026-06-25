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
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='properties'
    )
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

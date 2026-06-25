import uuid
from django.db import models

class AnalyticsEvent(models.Model):
    EVENT_TYPES = (
        ('PAGE_VIEW', 'Page View'),
        ('WHATSAPP_CLICK', 'WhatsApp CTA Click'),
        ('PHONE_CLICK', 'Phone Call Click'),
        ('IMAGE_VIEW', 'Image Full View'),
    )

    DEVICE_TYPES = (
        ('MOBILE', 'Mobile Phone'),
        ('DESKTOP', 'Desktop / Laptop'),
        ('TABLET', 'Tablet'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        'properties.Property', 
        on_delete=models.CASCADE, 
        related_name='analytics_events'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES, default='MOBILE')
    browser = models.CharField(max_length=100, blank=True, null=True)
    ip_hash = models.CharField(max_length=64, db_index=True)  # Anonymized IP hash
    location_city = models.CharField(max_length=100, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.event_type} on Property {self.property_id} at {self.timestamp}"

from django.db import models
from apps.accounts.tenant_models import TenantModel

class Lead(TenantModel):
    STATUS_CHOICES = (
        ('NEW', 'New / Uncontacted'),
        ('CONTACTED', 'Contacted / Active'),
        ('SITE_VISIT', 'Site Visit Scheduled'),
        ('NEGOTIATION', 'In Negotiation'),
        ('CLOSED', 'Closed / Won'),
        ('LOST', 'Lost / Not Interested'),
    )

    # tenant field is inherited from TenantModel
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads'
    )
    source = models.CharField(max_length=50, default='GATED_MODAL')  # e.g., WHATSAPP_CLICK, PHONE_CLICK, GATED_MODAL
    buyer_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    notes = models.TextField(blank=True, null=True)
    analytics_event = models.ForeignKey(
        'analytics.AnalyticsEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.buyer_name} ({self.phone}) - {self.status}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and self.property_id:
            from django.db.models import F
            from apps.properties.models import Property
            Property.objects_unfiltered.filter(id=self.property_id).update(leads_count=F('leads_count') + 1)

    def delete(self, *args, **kwargs):
        prop_id = self.property_id
        super().delete(*args, **kwargs)
        if prop_id:
            from django.db.models import F
            from apps.properties.models import Property
            Property.objects_unfiltered.filter(id=prop_id).update(leads_count=F('leads_count') - 1)

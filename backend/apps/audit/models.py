import uuid
from django.db import models
from django.conf import settings
from apps.accounts.tenant_models import TenantModel

class AuditLog(TenantModel):
    ACTION_CHOICES = (
        ('CREATE', 'Record Created'),
        ('UPDATE', 'Record Updated'),
        ('DELETE', 'Record Deleted'),
        ('SHARE', 'Record Shared'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    record_id = models.UUIDField()
    changes_payload = models.JSONField(default=dict, blank=True)  # Compares old vs new values
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on {self.model_name} ({self.record_id}) by User {self.actor_id}"

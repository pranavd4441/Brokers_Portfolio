import uuid

from django.conf import settings
from django.db import models

from apps.accounts.tenant_models import TenantModel


class AuditLog(TenantModel):
    ACTION_CHOICES = (
        ("CREATE", "Record Created"),
        ("UPDATE", "Record Updated"),
        ("DELETE", "Record Deleted"),
        ("SHARE", "Record Shared"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    record_id = models.UUIDField()
    changes_payload = models.JSONField(
        default=dict, blank=True
    )  # Compares old vs new values
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} on {self.model_name} ({self.record_id}) by User {self.actor_id}"


class ImmutableAuditLog(models.Model):
    """
    Append-only compliance audit log.
    Includes previous hash pointer (hash chain link) and HMAC digital signature.
    """

    id = models.BigAutoField(primary_key=True)
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True)
    actor_email = models.EmailField(blank=True, null=True)
    action = models.CharField(max_length=50)
    payload = models.TextField()  # JSON metadata representation
    previous_hash = models.CharField(max_length=64, blank=True, null=True)
    current_hash = models.CharField(max_length=64, db_index=True)
    signature = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]

    def save(self, *args, **kwargs):
        if not self.current_hash:
            # 1. Resolve previous hash pointer
            last_entry = ImmutableAuditLog.objects.order_by(
                "-created_at", "-id"
            ).first()
            self.previous_hash = (
                last_entry.current_hash if last_entry else "GENESIS_ROOT_HASH_POINTER"
            )

            # 2. Calculate cryptographic SHA-256 node hash
            import hashlib
            import hmac

            from django.conf import settings

            data_string = (
                f"{self.previous_hash}:{self.payload}:{self.actor_email}:{self.action}"
            )
            self.current_hash = hashlib.sha256(data_string.encode()).hexdigest()

            # 3. Create digital signature with Secret Key
            signing_key = getattr(
                settings,
                "AUDIT_LOG_SIGNING_KEY",
                "insecure-default-audit-key-for-local-runs-123",
            )
            self.signature = hmac.new(
                signing_key.encode(), self.current_hash.encode(), hashlib.sha256
            ).hexdigest()

        super().save(*args, **kwargs)

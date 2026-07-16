import uuid

from django.db import models


class WhatsAppSession(models.Model):
    STATE_CHOICES = (
        ("IDLE", "Idle"),
        ("COLLECTING", "Collecting Details"),
        ("UPDATING", "Updating Listing"),
        ("QUERYING", "Querying Inventory"),
    )

    phone_number = models.CharField(max_length=30, primary_key=True)
    tenant = models.ForeignKey(
        "accounts.Tenant",
        on_delete=models.CASCADE,
        related_name="whatsapp_sessions",
        null=True,
        blank=True,
    )
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default="IDLE")
    metadata = models.JSONField(default=dict, blank=True)
    temp_images = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session: {self.phone_number} - State: {self.state}"


class ConversationMessage(models.Model):
    DIRECTION_CHOICES = (
        ("INBOUND", "Inbound"),
        ("OUTBOUND", "Outbound"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        WhatsAppSession, on_delete=models.CASCADE, related_name="messages"
    )
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    message_type = models.CharField(
        max_length=20, default="TEXT"
    )  # TEXT | IMAGE | AUDIO | DOCUMENT
    body = models.TextField(blank=True, null=True)
    media_url = models.CharField(max_length=512, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.direction} - {self.session.phone_number} - {self.timestamp}"

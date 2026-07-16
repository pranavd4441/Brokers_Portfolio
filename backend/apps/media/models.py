import uuid
from django.db import models

class PropertyImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        'properties.Property', 
        on_delete=models.CASCADE, 
        related_name='images'
    )
    url = models.CharField(max_length=512)
    thumbnail_url = models.CharField(max_length=512)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'created_at']

    def __str__(self):
        return f"Image {self.display_order} for Property {self.property_id}"

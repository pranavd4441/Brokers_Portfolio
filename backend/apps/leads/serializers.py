from rest_framework import serializers
from .models import Lead

class LeadSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'property', 'property_title', 'source', 'buyer_name',
            'phone', 'email', 'status', 'notes', 'analytics_event',
            'tenant_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']

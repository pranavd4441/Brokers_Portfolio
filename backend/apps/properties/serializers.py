from rest_framework import serializers
from .models import Property
from apps.media.models import PropertyImage

class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ['id', 'url', 'thumbnail_url', 'display_order', 'created_at']
        read_only_fields = ['id', 'created_at']


class PropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'price', 'property_type', 'status',
            'city', 'area', 'location_address', 'bhk', 'square_feet', 'amenities',
            'images', 'created_by', 'created_by_name', 'tenant_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        # The view will handle injecting created_by and tenant into validated_data
        return super().create(validated_data)

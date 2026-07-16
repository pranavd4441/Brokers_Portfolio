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
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    slug = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'price', 'property_type', 'status',
            'city', 'area', 'location_address', 'bhk', 'square_feet', 'amenities',
            'images', 'created_by', 'created_by_name', 'assigned_to', 'assigned_to_name',
            'expires_at', 'views_count', 'leads_count', 'tenant_name', 'slug', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'views_count', 'leads_count']

    def get_slug(self, obj):
        share_link = obj.share_links.first()
        if not share_link:
            from apps.sharing.models import ShareLink
            try:
                # Fallback check unfiltered without write operations
                share_link = ShareLink.objects_unfiltered.filter(property=obj).first()
            except Exception:
                return None
        return share_link.slug if share_link else None

    def to_internal_value(self, data):
        # Create a mutable copy of the input dictionary to allow translations
        data = data.copy()
        
        # 1. Translate 'type' to 'property_type'
        if 'type' in data and 'property_type' not in data:
            val = str(data['type']).upper()
            if 'APARTMENT' in val or 'FLAT' in val:
                data['property_type'] = 'APARTMENT'
            elif 'HOUSE' in val or 'VILLA' in val:
                data['property_type'] = 'VILLA'
            elif 'PLOT' in val or 'LAND' in val:
                data['property_type'] = 'PLOT'
            elif 'COMMERCIAL' in val or 'OFFICE' in val or 'SHOP' in val:
                data['property_type'] = 'COMMERCIAL'
            else:
                data['property_type'] = 'APARTMENT'
                
        # 2. Translate 'location' to 'city' and 'area'
        if 'location' in data:
            loc = str(data['location'])
            if 'city' not in data:
                data['city'] = loc.split(',')[0].strip().split(' ')[0]
            if 'area' not in data:
                data['area'] = loc
                
        # 3. Translate 'address' to 'location_address'
        if 'address' in data and 'location_address' not in data:
            data['location_address'] = data['address']
            
        return super().to_internal_value(data)

    def create(self, validated_data):
        # The view will handle injecting created_by and tenant into validated_data
        return super().create(validated_data)

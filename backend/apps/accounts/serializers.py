from rest_framework import serializers
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Tenant, User

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'logo_url', 'brand_color', 'whatsapp_default_number', 'subscription_plan', 'created_at']
        read_only_fields = ['id', 'subscription_plan', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'role', 'tenant', 'created_at']
        read_only_fields = ['id', 'role', 'tenant', 'created_at']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Inject tenant_id, role, and name into the JWT payload
        token['tenant_id'] = str(user.tenant_id) if user.tenant_id else None
        token['role'] = user.role
        token['name'] = user.name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Also return user details in the response for convenience
        data['user'] = {
            'id': str(self.user.id),
            'name': self.user.name,
            'email': self.user.email,
            'role': self.user.role,
            'tenant_id': str(self.user.tenant_id) if self.user.tenant_id else None
        }
        return data


class RegistrationSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255, required=True)
    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value.lower()

    def create(self, validated_data):
        company_name = validated_data['company_name']
        name = validated_data['name']
        email = validated_data['email']
        password = validated_data['password']

        with transaction.atomic():
            # 1. Create Tenant
            tenant = Tenant.objects.create(name=company_name)
            
            # 2. Create User linked to Tenant with OWNER role
            user = User.objects.create_user(
                email=email,
                password=password,
                name=name,
                tenant=tenant,
                role='OWNER'
            )
            
        return user

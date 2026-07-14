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
        read_only_fields = ['id', 'email', 'role', 'tenant', 'created_at']


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
        import logging
        data = super().validate(attrs)
        
        # 1. Check if User has Multi-Factor Authentication enabled
        if self.user.mfa_enabled:
            from .models import MFATicket
            ticket = MFATicket.objects.create(user=self.user)
            return {
                "mfa_required": True,
                "ticket": str(ticket.id),
                "mfa_type": self.user.mfa_type
            }

        # 2. Record User Session Details
        refresh_token_str = data.get('refresh')
        if refresh_token_str:
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken(refresh_token_str)
            jti = refresh.get('jti')
            
            request = self.context.get('request')
            if request:
                from .utils import parse_user_agent, get_client_ip, get_client_city
                from .models import UserSession
                
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                browser, os_name = parse_user_agent(user_agent)
                ip = get_client_ip(request)
                city = get_client_city(request)
                
                # Audit check: detect if this is a new/unusual login location
                has_past_sessions = UserSession.objects.filter(user=self.user, is_active=True).exists()
                if has_past_sessions:
                    location_exists = UserSession.objects.filter(user=self.user, city=city, is_active=True).exists()
                    if not location_exists and city != "Unknown":
                        security_logger = logging.getLogger('security')
                        security_logger.warning(
                            f"Security Alert: New login location detected for {self.user.email} in {city} (IP: {ip})",
                            extra={
                                "extra_fields": {
                                    "user_id": str(self.user.id),
                                    "city": city,
                                    "ip": ip,
                                    "browser": browser,
                                    "os": os_name
                                }
                            }
                        )
                
                UserSession.objects.create(
                    user=self.user,
                    token_jti=jti,
                    ip_address=ip,
                    user_agent=user_agent[:512],
                    browser=browser,
                    os=os_name,
                    city=city
                )
        
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
    phone = serializers.CharField(max_length=20, required=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value.lower()

    def create(self, validated_data):
        company_name = validated_data['company_name']
        name = validated_data['name']
        email = validated_data['email']
        password = validated_data['password']
        phone = validated_data['phone']

        with transaction.atomic():
            # 1. Create Tenant
            tenant = Tenant.objects.create(name=company_name)
            
            # 2. Create User linked to Tenant with OWNER role
            user = User.objects.create_user(
                email=email,
                password=password,
                name=name,
                tenant=tenant,
                role='OWNER',
                phone=phone
            )
            
        return user


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import UserSession
        model = UserSession
        fields = ['id', 'ip_address', 'browser', 'os', 'city', 'login_time', 'last_activity', 'is_active']
        read_only_fields = fields

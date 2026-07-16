from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.throttling import AnonRateThrottle
from property_os.feature_flags import FeatureFlagService
from .serializers import (
    RegistrationSerializer, 
    UserSerializer, 
    TenantSerializer, 
    CustomTokenObtainPairSerializer
)
from .models import Tenant

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT login view using our customized token payload.
    Protected with AnonRateThrottle.
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AnonRateThrottle]


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom JWT refresh view.
    Protected with AnonRateThrottle.
    """
    throttle_classes = [AnonRateThrottle]


class RegistrationView(generics.CreateAPIView):
    """
    Public registration endpoint. Creates a new Tenant workspace
    along with an OWNER user account.
    Honors ENABLE_REGISTRATION feature flag and throttled with AnonRateThrottle.
    """
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def create(self, request, *args, **kwargs):
        if not FeatureFlagService.is_enabled("ENABLE_REGISTRATION"):
            return Response(
                {"detail": "User registration is currently disabled."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate programmatic JWT tokens using custom serializer to include tenant claims
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        
        # Return user info along with access and refresh tokens
        user_serializer = UserSerializer(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_serializer.data
        }, status=status.HTTP_201_CREATED)



class MeView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the authenticated user's profile and workspace info.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class TenantBrandingView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update tenant branding details (logo, name, brand color, whatsapp).
    Only accessible by OWNER or ADMIN roles of the active tenant.
    """
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Retrieve the tenant associated with the authenticated user
        return self.request.user.tenant

    def update(self, request, *args, **kwargs):
        # Strict role validation: only OWNER or ADMIN can edit branding
        user = request.user
        if user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {"detail": "You do not have permission to modify workspace branding settings."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)


class TeamListView(generics.ListAPIView):
    """
    List all active team members (users) under the active user's tenant.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.tenant.users.filter(is_active=True).order_by('name')


from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from .models import UserSession, MFATicket, MFARecoveryCode
from .serializers import UserSessionSerializer
from .utils import parse_user_agent, get_client_ip, get_client_city

class UserSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage user active device sessions.
    """
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user, is_active=True).order_by('-login_time')

    @action(detail=True, methods=['post'])
    def logout(self, request, pk=None):
        """
        Terminate a specific session and blacklist its refresh token.
        """
        session = self.get_object()
        session.is_active = False
        session.save()
        
        # Blacklist simple-jwt refresh token
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        try:
            ot = OutstandingToken.objects.get(jti=session.token_jti)
            BlacklistedToken.objects.get_or_create(token=ot)
        except OutstandingToken.DoesNotExist:
            pass
            
        return Response({"detail": "Session terminated successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='logout-other')
    def logout_other(self, request):
        """
        Terminate all other active sessions except the current one.
        """
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        
        current_session = UserSession.objects.filter(
            user=request.user, 
            ip_address=ip, 
            user_agent=ua, 
            is_active=True
        ).first()
        
        other_sessions = UserSession.objects.filter(user=request.user, is_active=True)
        if current_session:
            other_sessions = other_sessions.exclude(id=current_session.id)
            
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        for session in other_sessions:
            session.is_active = False
            session.save()
            try:
                ot = OutstandingToken.objects.get(jti=session.token_jti)
                BlacklistedToken.objects.get_or_create(token=ot)
            except OutstandingToken.DoesNotExist:
                pass
                
        return Response({"detail": "All other sessions terminated successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='logout-all')
    def logout_all(self, request):
        """
        Terminate all active sessions for the user and blacklist all outstanding tokens.
        """
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        # Blacklist all outstanding tokens for this user
        ots = OutstandingToken.objects.filter(user=request.user)
        for ot in ots:
            BlacklistedToken.objects.get_or_create(token=ot)
            
        # Mark all sessions as inactive
        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        return Response({"detail": "All active sessions logged out successfully."}, status=status.HTTP_200_OK)


class MFAVerifyView(APIView):
    """
    Endpoint to verify Multi-Factor Authentication OTP code (TOTP or recovery code)
    and return simple-jwt access/refresh tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        ticket_id = request.data.get('ticket')
        code = request.data.get('code')
        
        if not ticket_id or not code:
            return Response(
                {"detail": "Both 'ticket' and 'code' fields are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            ticket = MFATicket.objects.get(id=ticket_id, is_used=False)
        except (MFATicket.DoesNotExist, ValueError):
            return Response(
                {"detail": "Invalid or expired verification ticket."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if ticket.is_expired():
            return Response(
                {"detail": "Verification ticket has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = ticket.user
        verified = False
        
        # 1. Try TOTP validation
        import pyotp
        if user.mfa_secret:
            totp = pyotp.TOTP(user.mfa_secret)
            verified = totp.verify(code)
            
        # 2. Try Recovery Code validation if not verified via TOTP
        if not verified:
            from django.contrib.auth.hashers import check_password
            recovery_codes = MFARecoveryCode.objects.filter(user=user, is_used=False)
            for rcode in recovery_codes:
                if check_password(code, rcode.code_hash):
                    rcode.is_used = True
                    rcode.save()
                    verified = True
                    break
                    
        if not verified:
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Mark ticket as used
        ticket.is_used = True
        ticket.save()
        
        # Generate simple-jwt tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        refresh['tenant_id'] = str(user.tenant_id) if user.tenant_id else None
        refresh['role'] = user.role
        refresh['name'] = user.name
        
        # Create UserSession for this login
        jti = refresh.get('jti')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        browser, os_name = parse_user_agent(user_agent)
        ip = get_client_ip(request)
        city = get_client_city(request)
        
        UserSession.objects.create(
            user=user,
            token_jti=jti,
            ip_address=ip,
            user_agent=user_agent[:512],
            browser=browser,
            os=os_name,
            city=city
        )
        
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "tenant_id": str(user.tenant_id) if user.tenant_id else None
            }
        }, status=status.HTTP_200_OK)


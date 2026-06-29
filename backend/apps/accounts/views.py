from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
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
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegistrationView(generics.CreateAPIView):
    """
    Public registration endpoint. Creates a new Tenant workspace
    along with an OWNER user account.
    """
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
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


class MeView(generics.RetrieveAPIView):
    """
    Retrieve the authenticated user's profile and workspace info.
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

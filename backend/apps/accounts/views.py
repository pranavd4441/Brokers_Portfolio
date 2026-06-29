from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
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
        
        # Return serialized user info
        user_serializer = UserSerializer(user)
        return Response(user_serializer.data, status=status.HTTP_201_CREATED)


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

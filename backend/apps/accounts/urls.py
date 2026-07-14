from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RegistrationView, 
    CustomTokenObtainPairView, 
    CustomTokenRefreshView,
    MeView, 
    TenantBrandingView, 
    TeamListView,
    UserSessionViewSet,
    MFAVerifyView
)

router = DefaultRouter()
router.register('sessions', UserSessionViewSet, basename='sessions')

urlpatterns = [
    path('register/', RegistrationView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('tenant/branding/', TenantBrandingView.as_view(), name='tenant_branding'),
    path('team/', TeamListView.as_view(), name='auth_team'),
    path('mfa/verify/', MFAVerifyView.as_view(), name='mfa_verify'),
    path('', include(router.urls)),
]

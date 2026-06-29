from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegistrationView, CustomTokenObtainPairView, MeView, TenantBrandingView, TeamListView

urlpatterns = [
    path('register/', RegistrationView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('tenant/branding/', TenantBrandingView.as_view(), name='tenant_branding'),
    path('team/', TeamListView.as_view(), name='auth_team'),
]

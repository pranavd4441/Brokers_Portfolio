from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShareLinkViewSet, PublicPropertyResolverView

router = DefaultRouter()
router.register('links', ShareLinkViewSet, basename='share_link')

urlpatterns = [
    # Router endpoints for managing links inside the dashboard
    path('', include(router.urls)),
    
    # Public endpoint to resolve a slug (zero-auth)
    path('public/<str:slug>/', PublicPropertyResolverView.as_view(), name='public_slug_resolve'),
]

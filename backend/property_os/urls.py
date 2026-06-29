from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth & Accounts endpoints
    path('api/auth/', include('apps.accounts.urls')),
    
    # Property Inventory endpoints
    path('api/properties/', include('apps.properties.urls')),
    
    # Sharing & Slugs endpoints
    path('api/sharing/', include('apps.sharing.urls')),
    
    # Analytics endpoints
    path('api/analytics/', include('apps.analytics.urls')),
    
    # Media endpoints
    path('api/media/', include('apps.media.urls')),
]

# Serve media files in development mode (fallback storage)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

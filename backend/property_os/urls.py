from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection

import time
import os
import redis
import uuid
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from property_os.throttling import PublicRateThrottle

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicRateThrottle]

    def get(self, request, *args, **kwargs):
        start_time = time.time()
        health_data = {
            "status": "healthy",
            "environment": os.getenv("DJANGO_ENVIRONMENT", "development"),
            "version": os.getenv("RELEASE_VERSION", "1.0.0"),
            "details": {}
        }
        
        # 1. Check Database
        db_up = True
        try:
            connections['default'].cursor()
            health_data["details"]["database"] = "up"
        except Exception as e:
            db_up = False
            health_data["details"]["database"] = f"down: {str(e)}"
            
        # 2. Check Database Migrations
        migrations_pending = False
        if db_up:
            try:
                executor = MigrationExecutor(connections['default'])
                plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
                migrations_pending = len(plan) > 0
                health_data["details"]["migrations_pending"] = migrations_pending
            except Exception as e:
                health_data["details"]["migrations_pending"] = f"unknown: {str(e)}"
        else:
            health_data["details"]["migrations_pending"] = "unknown (db down)"

        # 3. Check Redis
        redis_up = True
        redis_url = os.getenv('REDIS_URL', '')
        if redis_url:
            try:
                r = redis.Redis.from_url(redis_url, socket_timeout=2)
                r.ping()
                health_data["details"]["redis"] = "up"
            except Exception as e:
                redis_up = False
                health_data["details"]["redis"] = f"down: {str(e)}"
        else:
            health_data["details"]["redis"] = "skipped (no REDIS_URL)"

        # 4. Check Celery
        if redis_url:
            try:
                from property_os.celery import app as celery_app
                inspector = celery_app.control.inspect(timeout=1.0)
                ping_status = inspector.ping()
                if ping_status and len(ping_status) > 0:
                    health_data["details"]["celery"] = "up"
                else:
                    health_data["details"]["celery"] = "down (no workers pinged)"
            except Exception as e:
                health_data["details"]["celery"] = f"down: {str(e)}"
        else:
            health_data["details"]["celery"] = "skipped (eager mode)"

        # 5. Check Object Storage Accessibility
        file_name = f"healthcheck_{uuid.uuid4().hex}.txt"
        try:
            path = default_storage.save(file_name, ContentFile(b"OK"))
            if default_storage.exists(path):
                default_storage.delete(path)
                health_data["details"]["storage"] = "up"
            else:
                health_data["details"]["storage"] = "down (file save verified but not found)"
        except Exception as e:
            health_data["details"]["storage"] = f"down: {str(e)}"

        # Set final overall status
        if not db_up or migrations_pending or (redis_url and not redis_up) or health_data["details"]["storage"].startswith("down"):
            health_data["status"] = "unhealthy"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        else:
            status_code = status.HTTP_200_OK

        health_data["response_time_ms"] = int((time.time() - start_time) * 1000)
        return Response(health_data, status=status_code)

from apps.audit.views import PrometheusMetricsView

v1_urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check_v1'),
    path('metrics/', PrometheusMetricsView.as_view(), name='prometheus_metrics_v1'),
    path('auth/', include('apps.accounts.urls')),
    path('properties/', include('apps.properties.urls')),
    path('sharing/', include('apps.sharing.urls')),
    path('analytics/', include('apps.analytics.urls')),
    path('whatsapp/', include('apps.whatsapp.urls')),
    path('leads/', include('apps.leads.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Version 1
    path('api/v1/', include((v1_urlpatterns, 'v1'))),
    
    # Backwards compatibility fallback routes
    path('api/health/', HealthCheckView.as_view(), name='health_check'),
    path('api/metrics/', PrometheusMetricsView.as_view(), name='prometheus_metrics'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/properties/', include('apps.properties.urls')),
    path('api/sharing/', include('apps.sharing.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/whatsapp/', include('apps.whatsapp.urls')),
    path('api/leads/', include('apps.leads.urls')),
]

# Serve media files in development mode (fallback storage)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

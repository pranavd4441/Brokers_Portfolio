from django.urls import path
from .views import PublicEventLogView, DashboardMetricsView

urlpatterns = [
    # Public endpoint to log page views and CTA clicks (zero-auth)
    path('log/', PublicEventLogView.as_view(), name='analytics_log_event'),
    
    # Authenticated endpoint to retrieve broker metrics dashboard
    path('dashboard/', DashboardMetricsView.as_view(), name='analytics_dashboard'),
]

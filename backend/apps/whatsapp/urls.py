from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WhatsAppSessionViewSet, WhatsAppWebhookView

router = DefaultRouter()
router.register("sessions", WhatsAppSessionViewSet, basename="whatsapp_session")

urlpatterns = [
    # Inbound webhook from WhatsApp API / Twilio
    path("webhook/", WhatsAppWebhookView.as_view(), name="whatsapp_webhook"),
    # Session and message APIs
    path("", include(router.urls)),
]

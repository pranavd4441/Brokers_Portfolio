import hashlib
import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.properties.models import Property
from apps.sharing.models import ShareLink

from .models import AnalyticsEvent

logger = logging.getLogger(__name__)

from apps.accounts.utils import get_frontend_url
from property_os.feature_flags import FeatureFlagService
from property_os.throttling import PublicRateThrottle


class PublicEventLogView(generics.CreateAPIView):
    """
    Public (zero-auth) endpoint to log public interactions on property landing pages.
    Extracts IP hash, device type, and browser signature directly from request headers.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicRateThrottle]
    public_statuses = {"AVAILABLE", "NEGOTIATION", "SITE_VISIT", "BOOKED"}

    def post(self, request, *args, **kwargs):
        if not FeatureFlagService.is_enabled("ENABLE_ANALYTICS"):
            return Response(
                {"detail": "Analytics features are currently disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )
        property_id = request.data.get("property")
        event_type = request.data.get("event_type")
        share_slug = request.data.get("share_slug") or request.data.get("slug")

        if not property_id or not event_type:
            return Response(
                {"detail": "Both property ID and event_type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_event_types = {choice[0] for choice in AnalyticsEvent.EVENT_TYPES}
        if event_type not in valid_event_types:
            return Response(
                {"detail": "Unsupported analytics event type."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Resolve only properties that are actively exposed through a share link.
        try:
            property_obj = Property.objects_unfiltered.select_related(
                "tenant", "created_by", "assigned_to"
            ).get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {"detail": "Property listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        share_links = ShareLink.objects_unfiltered.filter(property=property_obj)
        if share_slug:
            share_links = share_links.filter(slug=share_slug)

        share_link = share_links.order_by("-created_at").first()
        if not share_link:
            return Response(
                {"detail": "This listing is not available through a public share link."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if share_link.expiry and share_link.expiry < timezone.now():
            return Response(
                {"detail": "This sharing link has expired."},
                status=status.HTTP_410_GONE,
            )
        if property_obj.status not in self.public_statuses:
            return Response(
                {"detail": "This listing is no longer available publicly."},
                status=status.HTTP_410_GONE,
            )

        # 2. Extract Client IP and hash it for GDPR compliance
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "127.0.0.1")
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()

        # 3. Detect Device Type and Browser from User-Agent
        user_agent = request.META.get("HTTP_USER_AGENT", "").lower()

        # Simple device detection
        if "mobile" in user_agent or "android" in user_agent or "iphone" in user_agent:
            device_type = "MOBILE"
        elif "tablet" in user_agent or "ipad" in user_agent:
            device_type = "TABLET"
        else:
            device_type = "DESKTOP"

        # Simple browser detection
        browser = "Other"
        if "chrome" in user_agent:
            browser = "Chrome"
        elif "safari" in user_agent and "chrome" not in user_agent:
            browser = "Safari"
        elif "firefox" in user_agent:
            browser = "Firefox"
        elif "edge" in user_agent or "edg" in user_agent:
            browser = "Edge"

        # 4. Save Analytics Event
        event = AnalyticsEvent.objects.create(
            property=property_obj,
            event_type=event_type,
            device_type=device_type,
            browser=browser,
            ip_hash=ip_hash,
        )

        # 5. Save Lead and Trigger Real-time Lead Alerts via WhatsApp (using a background thread to prevent API blocking)
        if event_type in ["WHATSAPP_CLICK", "PHONE_CLICK"]:
            buyer_name = request.data.get("buyer_name", "A prospective buyer")
            buyer_phone = request.data.get("buyer_phone", "Not captured")
            buyer_name = str(buyer_name).strip()[:120] or "A prospective buyer"
            buyer_phone = str(buyer_phone).strip()[:20] or "Not captured"

            # Create Lead record in the database
            lead = None
            try:
                from apps.leads.models import Lead

                recent_window = timezone.now() - timedelta(hours=6)
                lead = Lead.objects_unfiltered.filter(
                    tenant=property_obj.tenant,
                    property=property_obj,
                    phone=buyer_phone,
                    created_at__gte=recent_window,
                ).first()
                if lead:
                    lead.buyer_name = buyer_name
                    lead.source = event_type
                    lead.analytics_event = event
                    lead.notes = (
                        (lead.notes or "")
                        + f"\nLatest signal: {event_type} at {timezone.now().isoformat()}"
                    ).strip()
                    lead.save(update_fields=["buyer_name", "source", "analytics_event", "notes", "updated_at"])
                else:
                    lead = Lead.objects.create(
                        tenant=property_obj.tenant,
                        property=property_obj,
                        source=event_type,
                        buyer_name=buyer_name,
                        phone=buyer_phone,
                        analytics_event=event,
                        notes=(
                            "Auto-captured from public listing CTA. "
                            "Recommended action: call or WhatsApp within 5 minutes."
                        ),
                    )
            except Exception as le:
                logger.error(f"Failed to create Lead record: {str(le)}")

            broker = property_obj.created_by
            if broker and broker.phone:
                broker_phone = broker.phone

                host = get_frontend_url(request)
                public_url = f"{host}/p/{share_link.slug}"

                event_label = (
                    "WhatsApp Click"
                    if event_type == "WHATSAPP_CLICK"
                    else "Phone Call Click"
                )

                alert_body = (
                    f"⚡ *New Lead - {event_label}*\n"
                    f"👤 *Name:* {buyer_name}\n"
                    f"📞 *Phone:* {buyer_phone}\n\n"
                    f"🏡 *Listing:* {property_obj.title}\n"
                    f"💵 *Price:* ₹{float(property_obj.price):,.2f}\n"
                    f"🔗 *Listing Link:* {public_url}\n\n"
                    "🔥 *5-minute playbook:*\n"
                    "1. Reply immediately with the listing link.\n"
                    "2. Ask: \"Would you like a video tour or site visit slot?\"\n"
                    "3. Offer 2 time options so they can choose fast.\n\n"
                    "Suggested reply:\n"
                    f"Hi {buyer_name.split()[0]}, thanks for checking {property_obj.title}. "
                    "Would you prefer a quick video tour or a site visit?"
                )

                import threading

                def send_alert_async(phone, body):
                    try:
                        from apps.whatsapp.services import get_whatsapp_gateway

                        gateway = get_whatsapp_gateway()
                        buttons = None
                        if lead:
                            buttons = [
                                {"id": f"lead_view_{lead.id}", "title": "View Lead"},
                                {
                                    "id": f"lead_contacted_{lead.id}",
                                    "title": "Mark Contacted",
                                },
                            ]
                        gateway.send_message(phone, body, buttons=buttons)
                    except Exception as le:
                        logger.error(
                            f"Failed to dispatch WhatsApp lead alert: {str(le)}"
                        )

                threading.Thread(
                    target=send_alert_async,
                    args=(broker_phone, alert_body),
                    daemon=True,
                ).start()

        return Response(
            {"detail": "Event logged successfully.", "event_id": str(event.id)},
            status=status.HTTP_201_CREATED,
        )


class DashboardMetricsView(generics.RetrieveAPIView):
    """
    Authenticated endpoint providing aggregated analytics dashboard metrics.
    Isolated by Tenant.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get(self, request, *args, **kwargs):
        if not FeatureFlagService.is_enabled("ENABLE_ANALYTICS"):
            return Response(
                {"detail": "Analytics features are currently disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Property.objects automatically isolates queries to current tenant
        properties = Property.objects.all()
        total_properties = properties.count()

        # Gather events for tenant properties
        events = AnalyticsEvent.objects.filter(property__in=properties)

        total_views = events.filter(event_type="PAGE_VIEW").count()
        whatsapp_clicks = events.filter(event_type="WHATSAPP_CLICK").count()
        phone_clicks = events.filter(event_type="PHONE_CLICK").count()
        image_views = events.filter(event_type="IMAGE_VIEW").count()

        total_clicks = whatsapp_clicks + phone_clicks
        conversion_rate = (
            round((total_clicks / total_views * 100), 2) if total_views > 0 else 0.0
        )

        # Group by device type
        device_stats = (
            events.values("device_type").annotate(count=Count("id")).order_by("-count")
        )

        # Get top 5 properties by views
        top_properties_raw = properties.annotate(
            views=Count(
                "analytics_events", filter=Q(analytics_events__event_type="PAGE_VIEW")
            )
        ).order_by("-views")[:5]

        top_properties = []
        for p in top_properties_raw:
            top_properties.append(
                {
                    "id": str(p.id),
                    "title": p.title,
                    "views": p.views,
                    "price": float(p.price),
                    "status": p.status,
                }
            )

        # Generate a 7-day timeseries of views and clicks
        today = timezone.now().date()
        timeseries = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_start = timezone.make_aware(
                timezone.datetime.combine(day, timezone.datetime.min.time())
            )
            day_end = timezone.make_aware(
                timezone.datetime.combine(day, timezone.datetime.max.time())
            )

            day_events = events.filter(timestamp__range=(day_start, day_end))
            day_views = day_events.filter(event_type="PAGE_VIEW").count()
            day_clicks = day_events.filter(
                event_type__in=["WHATSAPP_CLICK", "PHONE_CLICK"]
            ).count()

            timeseries.append(
                {
                    "date": day.strftime("%a %d %b"),  # e.g. 'Fri 26 Jun'
                    "views": day_views,
                    "clicks": day_clicks,
                }
            )

        payload = {
            "summary": {
                "total_properties": total_properties,
                "total_views": total_views,
                "whatsapp_clicks": whatsapp_clicks,
                "phone_clicks": phone_clicks,
                "image_views": image_views,
                "total_clicks": total_clicks,
                "conversion_rate": conversion_rate,
            },
            "device_distribution": {
                item["device_type"]: item["count"] for item in device_stats
            },
            "top_properties": top_properties,
            "performance_chart": timeseries,
        }

        return Response(payload, status=status.HTTP_200_OK)

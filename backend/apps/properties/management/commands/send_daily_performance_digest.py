from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.utils import timezone

from apps.accounts.models import Tenant
from apps.analytics.models import AnalyticsEvent
from apps.leads.models import Lead
from apps.properties.models import Property
from apps.whatsapp.services import get_whatsapp_gateway


class Command(BaseCommand):
    help = "Generates and sends a daily property performance digest to brokers via WhatsApp."

    def handle(self, *args, **options):
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        tenants = Tenant.objects.all()

        try:
            gateway = get_whatsapp_gateway()
        except Exception as ge:
            self.stderr.write(f"Failed to load WhatsApp gateway: {str(ge)}")
            return

        for tenant in tenants:
            # 1. Get properties
            tenant_properties = Property.objects_unfiltered.filter(tenant=tenant)
            active_count = tenant_properties.filter(status="AVAILABLE").count()

            if tenant_properties.count() == 0:
                continue

            # 2. Get views in last 24h
            views_24h = AnalyticsEvent.objects.filter(
                property__in=tenant_properties,
                event_type="PAGE_VIEW",
                timestamp__gte=yesterday,
            ).count()

            # 3. Get leads in last 24h
            leads_24h = Lead.objects_unfiltered.filter(
                property__in=tenant_properties, created_at__gte=yesterday
            ).count()

            # 4. Get top 3 properties by views in the last 24h
            top_props = (
                tenant_properties.filter(
                    analytics_events__event_type="PAGE_VIEW",
                    analytics_events__timestamp__gte=yesterday,
                )
                .annotate(views_last_day=Count("analytics_events"))
                .order_by("-views_last_day")[:3]
            )

            # 5. Build digest message
            digest = (
                f"📊 *PropertyOS Daily Performance Digest*\n"
                f"🏢 *Workspace:* {tenant.name}\n\n"
                f"🏡 *Active Listings:* {active_count}\n"
                f"👀 *New Page Views (24h):* {views_24h}\n"
                f"🎯 *New Leads Captured (24h):* {leads_24h}\n\n"
            )

            if top_props.exists():
                digest += "🔥 *Top Performing Listings (24h):*\n"
                for idx, prop in enumerate(top_props, 1):
                    prop_leads = Lead.objects_unfiltered.filter(
                        property=prop, created_at__gte=yesterday
                    ).count()
                    digest += f"{idx}. {prop.title}\n   👀 {prop.views_last_day} views | 🎯 {prop_leads} leads\n"
                digest += "\n"

            digest += "🚀 *Keep sharing your listings to capture more leads!*"

            # 6. Dispatch to all active owners/brokers in this tenant who have phone numbers
            brokers = tenant.users.filter(
                role__in=["OWNER", "ADMIN", "BROKER"], is_active=True
            ).exclude(phone="")
            for broker in brokers:
                try:
                    gateway.send_message(broker.phone, digest)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Sent digest to {broker.name} ({broker.phone})"
                        )
                    )
                except Exception as e:
                    self.stderr.write(
                        f"Failed to send digest to {broker.name}: {str(e)}"
                    )

import os
from django.http import HttpResponse
from rest_framework.views import APIView
from django.db import connection
from apps.properties.models import Property
from apps.leads.models import Lead
from apps.accounts.models import UserSession, User

class PrometheusMetricsView(APIView):
    """
    Exports system, connection, process memory, and business indicators
    formatted in Prometheus OpenMetrics text representation.
    """
    permission_classes = []  # Scraped internally by infrastructure monitor (token checked below)

    def get(self, request, *args, **kwargs):
        # Optional scrape token auth
        scrape_token = os.getenv('METRICS_SCRAPE_TOKEN', '')
        if scrape_token:
            incoming_token = request.headers.get('X-Metrics-Token') or request.query_params.get('token')
            if incoming_token != scrape_token:
                return HttpResponse("Unauthorized", status=401)

        metrics = []

        # 1. Database Connections
        db_engine = connection.settings_dict['ENGINE']
        active_conns = 1
        if 'postgresql' in db_engine:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT count(*) FROM pg_stat_activity;")
                    active_conns = cursor.fetchone()[0]
            except Exception:
                pass  # nosec B110
        metrics.append("# HELP django_db_connections_active Active database connections.")
        metrics.append("# TYPE django_db_connections_active gauge")
        metrics.append(f"django_db_connections_active {active_conns}")

        # 2. System Resource Usage
        try:
            import resource
            max_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            metrics.append("# HELP process_max_rss_kb Maximum resident set size in kilobytes.")
            metrics.append("# TYPE process_max_rss_kb gauge")
            metrics.append(f"process_max_rss_kb {max_rss}")
        except Exception:
            pass  # nosec B110

        # 3. SaaS Business Metrics (cross-tenant global counts for platform tracking)
        properties_count = Property.objects_unfiltered.count()
        leads_count = Lead.objects_unfiltered.count()
        active_sessions = UserSession.objects.filter(is_active=True).count()
        users_count = User.objects.count()

        metrics.append("# HELP propertyos_properties_total Total property listings on the platform.")
        metrics.append("# TYPE propertyos_properties_total counter")
        metrics.append(f"propertyos_properties_total {properties_count}")

        metrics.append("# HELP propertyos_leads_total Total prospective buyer leads created.")
        metrics.append("# TYPE propertyos_leads_total counter")
        metrics.append(f"propertyos_leads_total {leads_count}")

        metrics.append("# HELP propertyos_active_sessions Total active user device sessions.")
        metrics.append("# TYPE propertyos_active_sessions gauge")
        metrics.append(f"propertyos_active_sessions {active_sessions}")

        metrics.append("# HELP propertyos_users_total Total user accounts created.")
        metrics.append("# TYPE propertyos_users_total counter")
        metrics.append(f"propertyos_users_total {users_count}")

        # Join metrics with newlines
        payload = "\n".join(metrics) + "\n"
        return HttpResponse(payload, content_type="text/plain; version=0.0.4; charset=utf-8")

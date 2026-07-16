from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.properties.models import Property
from apps.audit.utils import log_audit_event

class Command(BaseCommand):
    help = "Checks and marks properties past their expires_at date as EXPIRED."

    def handle(self, *args, **options):
        now = timezone.now()
        expired_properties = Property.objects_unfiltered.filter(
            expires_at__lte=now
        ).exclude(status__in=['SOLD', 'EXPIRED'])

        count = expired_properties.count()
        for prop in expired_properties:
            old_status = prop.status
            prop.status = 'EXPIRED'
            prop.save(update_fields=['status'])
            
            # Find a broker user belonging to the tenant to log the audit event
            broker = prop.created_by
            if not broker:
                broker = prop.tenant.users.filter(role='OWNER').first()
                
            if broker:
                log_audit_event(
                    user=broker,
                    action='UPDATE',
                    instance=prop,
                    changes_payload={"status": {"old": old_status, "new": 'EXPIRED'}, "note": "Auto-expired by system"}
                )

        self.stdout.write(self.style.SUCCESS(f"Successfully auto-expired {count} property listings."))

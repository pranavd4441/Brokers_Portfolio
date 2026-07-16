import hashlib
import hmac
import sys

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.audit.models import ImmutableAuditLog


class Command(BaseCommand):
    """
    Verification command to validate the integrity of the immutable audit log hash chain.
    Ensures no records have been deleted, modified, or re-signed.
    """

    help = "Validates the hash chain and signatures of all entries in the ImmutableAuditLog."

    def handle(self, *args, **options):
        self.stdout.write(
            "[PropertyOS] Beginning cryptographic audit log verification..."
        )

        logs = ImmutableAuditLog.objects.order_by("created_at", "id")
        total_records = logs.count()

        if total_records == 0:
            self.stdout.write(
                self.style.SUCCESS("No audit records found. Chain is empty and valid.")
            )
            return

        expected_previous_hash = "GENESIS_ROOT_HASH_POINTER"
        signing_key = getattr(
            settings,
            "AUDIT_LOG_SIGNING_KEY",
            "insecure-default-audit-key-for-local-runs-123",
        )

        tampered_records = []

        for index, log in enumerate(logs):
            # 1. Verify previous hash pointer integrity
            if log.previous_hash != expected_previous_hash:
                tampered_records.append(
                    {
                        "id": str(log.id),
                        "action": log.action,
                        "reason": f"Broken Hash Link: Expected previous hash '{expected_previous_hash[:10]}...', but found '{log.previous_hash[:10]}...' (Indicates deletion or insertion).",
                    }
                )

            # 2. Recalculate node hash
            data_string = (
                f"{log.previous_hash}:{log.payload}:{log.actor_email}:{log.action}"
            )
            recalculated_hash = hashlib.sha256(data_string.encode()).hexdigest()

            if log.current_hash != recalculated_hash:
                tampered_records.append(
                    {
                        "id": str(log.id),
                        "action": log.action,
                        "reason": f"Integrity Failure: Stored hash '{log.current_hash[:10]}...' does not match calculated hash '{recalculated_hash[:10]}...' (Indicates payload modification).",
                    }
                )

            # 3. Verify digital signature
            expected_signature = hmac.new(
                signing_key.encode(), log.current_hash.encode(), hashlib.sha256
            ).hexdigest()

            if log.signature != expected_signature:
                tampered_records.append(
                    {
                        "id": str(log.id),
                        "action": log.action,
                        "reason": "Signature Mismatch: HMAC signature is invalid (Indicates key mismatch or signature re-sign attempt).",
                    }
                )

            # Advance expected previous hash pointer
            expected_previous_hash = log.current_hash

        if tampered_records:
            self.stdout.write(
                self.style.ERROR(
                    f"\n[ALERT] Cryptographic validation failed! {len(tampered_records)} anomalies detected:"
                )
            )
            for record in tampered_records:
                self.stdout.write(
                    self.style.ERROR(
                        f" - Log ID: {record['id']} | Action: {record['action']} | Reason: {record['reason']}"
                    )
                )
            sys.exit(1)
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n[PropertyOS] Cryptographic validation SUCCESS: Validated {total_records} records. Chain is unbroken and signatures are valid."
                )
            )

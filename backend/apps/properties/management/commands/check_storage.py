import os
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Diagnoses Django storage backend settings and tests file upload"

    def handle(self, *args, **options):
        self.stdout.write("=== STORAGE DIAGNOSTIC ===")

        # 1. Print current configured storage backend class name
        storage_class = default_storage.__class__.__name__
        self.stdout.write(f"Default File Storage Class: {storage_class}")

        # 2. Check settings variables
        self.stdout.write("\n=== SETTINGS VARIABLES ===")
        self.stdout.write(
            f"STORAGES settings: {getattr(settings, 'STORAGES', 'Not Defined')}"
        )

        # Helper to check environment variable
        def check_env(name):
            val = os.getenv(name)
            if val:
                # Obfuscate credentials for safety
                obfuscated = val[:4] + "..." + val[-4:] if len(val) > 8 else "..."
                self.stdout.write(f"Env {name}: SET ({obfuscated})")
            else:
                self.stdout.write(f"Env {name}: NOT SET")

        check_env("AWS_ACCESS_KEY_ID")
        check_env("AWS_SECRET_ACCESS_KEY")
        check_env("AWS_STORAGE_BUCKET_NAME")
        check_env("AWS_S3_ENDPOINT_URL")
        check_env("AWS_S3_REGION_NAME")
        check_env("AWS_QUERYSTRING_AUTH")
        check_env("AWS_S3_CUSTOM_DOMAIN")

        # 3. Test saving a file
        self.stdout.write("\n=== TEST FILE SAVE ===")
        file_name = f"test_diagnostic_{uuid.uuid4().hex[:8]}.txt"
        try:
            path = default_storage.save(file_name, ContentFile(b"DIAGNOSTIC_TEST"))
            self.stdout.write(f"Successfully saved file: {path}")

            # Get URL
            url = default_storage.url(path)
            self.stdout.write(f"Generated URL: {url}")

            # Delete file
            default_storage.delete(path)
            self.stdout.write("Successfully cleaned up/deleted file.")
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed during file save/cleanup: {str(e)}")
            )

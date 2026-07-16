import os
import time
import logging
import glob
import tempfile
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Cleans up orphaned temporary image files older than 24 hours from local temp and storage."

    def handle(self, *args, **options):
        cutoff = datetime.now() - timedelta(hours=24)
        deleted_count = 0

        # 1. Clean up default_storage "properties/temp/" if it exists
        try:
            if default_storage.exists("properties/temp"):
                directories, files = default_storage.listdir("properties/temp")
                for filename in files:
                    filepath = f"properties/temp/{filename}"
                    try:
                        mtime = default_storage.get_modified_time(filepath)
                        # Make mtime naive if cutoff is naive for comparison
                        if mtime.tzinfo is not None:
                            mtime = mtime.replace(tzinfo=None)

                        if mtime < cutoff:
                            default_storage.delete(filepath)
                            deleted_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"Deleted storage temp file: {filepath}"
                                )
                            )
                    except Exception as e:
                        self.stderr.write(
                            f"Error checking/deleting storage temp file {filepath}: {str(e)}"
                        )
        except Exception as e:
            self.stderr.write(f"Error listing storage temp directory: {str(e)}")

        # 2. Clean up local OS temp directory for orphaned files matching our pattern
        temp_dir = tempfile.gettempdir()
        cutoff_timestamp = time.time() - (24 * 3600)

        # In views.py, NamedTemporaryFile is used with suffix=f"_{file_obj.name}"
        # and starts with 'tmp'. We search for 'tmp*_*' in temp_dir.
        for filepath in glob.glob(os.path.join(temp_dir, "tmp*_*")):
            try:
                if os.path.isfile(filepath):
                    mtime = os.path.getmtime(filepath)
                    if mtime < cutoff_timestamp:
                        os.remove(filepath)
                        deleted_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"Deleted local temp file: {filepath}")
                        )
            except Exception as e:
                self.stderr.write(
                    f"Error deleting local temp file {filepath}: {str(e)}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {deleted_count} orphaned temporary files."
            )
        )

import sys

from django.core.management.base import BaseCommand
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.operations import (
    AddField,
    AddIndex,
    DeleteModel,
    RemoveField,
    RenameField,
    RenameModel,
)


class Command(BaseCommand):
    """
    Management command to audit database migrations for safety and ensure zero-downtime deployments.
    Fails the build (exits with status 1) if dangerous operations (drops, renames, non-nullable additions)
    are detected.
    """

    help = "Validates Django migrations against zero-downtime safety guidelines."

    def handle(self, *args, **options):
        self.stdout.write(
            "[PropertyOS] Auditing migrations for zero-downtime compliance..."
        )

        loader = MigrationLoader(None)
        unsafe_migrations = []

        local_apps = {
            "accounts",
            "analytics",
            "audit",
            "leads",
            "media",
            "properties",
            "sharing",
            "whatsapp",
        }

        for (app_label, migration_name), migration in loader.disk_migrations.items():
            if app_label not in local_apps:
                continue

            for op in migration.operations:
                # 1. Dropping Columns
                if isinstance(op, RemoveField):
                    unsafe_migrations.append(
                        (
                            app_label,
                            migration_name,
                            f"RemoveField: Dropping column '{op.name}' from model '{op.model_name}'",
                        )
                    )
                # 2. Dropping Tables
                elif isinstance(op, DeleteModel):
                    unsafe_migrations.append(
                        (
                            app_label,
                            migration_name,
                            f"DeleteModel: Dropping table for model '{op.name}'",
                        )
                    )
                # 3. Renaming Columns
                elif isinstance(op, RenameField):
                    unsafe_migrations.append(
                        (
                            app_label,
                            migration_name,
                            f"RenameField: Renaming column '{op.old_name}' to '{op.new_name}' on model '{op.model_name}'",
                        )
                    )
                # 4. Renaming Tables
                elif isinstance(op, RenameModel):
                    unsafe_migrations.append(
                        (
                            app_label,
                            migration_name,
                            f"RenameModel: Renaming table for model '{op.old_name}' to '{op.new_name}'",
                        )
                    )
                # 5. Non-nullable additions
                elif isinstance(op, AddField):
                    field = op.field
                    # If field is not null and has no default, it blocks existing row creation
                    from django.db.models import NOT_PROVIDED

                    if (
                        not getattr(field, "null", False)
                        and getattr(field, "default", NOT_PROVIDED) is NOT_PROVIDED
                    ):
                        # Primary keys / Auto fields are populated automatically
                        from django.db.models import AutoField, UUIDField

                        if not isinstance(field, (AutoField,)) and not (
                            isinstance(field, UUIDField)
                            and getattr(field, "default", None) is not None
                        ):
                            unsafe_migrations.append(
                                (
                                    app_label,
                                    migration_name,
                                    f"AddField: Adding non-nullable field '{op.name}' without a default to '{op.model_name}'",
                                )
                            )
                # 6. Non-concurrent indices
                elif isinstance(op, AddIndex):
                    if not hasattr(op, "atomic") or op.atomic:
                        pass

        if unsafe_migrations:
            self.stdout.write(
                self.style.ERROR(
                    "\n[ALERT] Unsafe database migrations detected! Pipeline blocked:"
                )
            )
            for app, name, reason in unsafe_migrations:
                self.stdout.write(self.style.ERROR(f" - {app}.{name}: {reason}"))
            sys.exit(1)
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "\n[PropertyOS] All migrations conform to zero-downtime safety guidelines!"
                )
            )

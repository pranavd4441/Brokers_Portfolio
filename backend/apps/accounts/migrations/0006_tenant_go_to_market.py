from django.db import migrations, models


class AddFieldIfMissing(migrations.AddField):
    """Add a field on fresh databases without breaking legacy pilot schemas.

    Early development databases applied these fields under the historical
    migration name ``0005_tenant_go_to_market``. The repository later gained
    a different 0005 migration and renumbered this file to 0006, leaving those
    databases with the columns but without the new migration record.
    """

    reduces_to_sql = False

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        field = model._meta.get_field(self.name)
        with schema_editor.connection.cursor() as cursor:
            description = schema_editor.connection.introspection.get_table_description(
                cursor, model._meta.db_table
            )
        existing_columns = {column.name for column in description}
        if field.column not in existing_columns:
            schema_editor.add_field(model, field)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        # These columns may belong to the historical migration. Never remove
        # them automatically during a compatibility rollback.
        return None


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_migrate_tenant_logos")]

    operations = [
        AddFieldIfMissing(model_name="tenant", name="plan_status", field=models.CharField(choices=[("PILOT", "14-day pilot"), ("ACTIVE", "Active paid plan"), ("EXPIRED", "Pilot expired"), ("CANCELLED", "Cancelled")], default="PILOT", max_length=20)),
        AddFieldIfMissing(model_name="tenant", name="pilot_started_at", field=models.DateTimeField(blank=True, null=True)),
        AddFieldIfMissing(model_name="tenant", name="pilot_ends_at", field=models.DateTimeField(blank=True, null=True)),
        AddFieldIfMissing(model_name="tenant", name="founding_price_expires_at", field=models.DateTimeField(blank=True, null=True)),
        AddFieldIfMissing(model_name="tenant", name="acquisition_source", field=models.CharField(blank=True, default="direct", max_length=100)),
        AddFieldIfMissing(model_name="tenant", name="acquisition_city", field=models.CharField(blank=True, default="Pune", max_length=100)),
        AddFieldIfMissing(model_name="tenant", name="referral_code", field=models.CharField(blank=True, max_length=24, null=True, unique=True)),
        AddFieldIfMissing(model_name="tenant", name="referred_by_code", field=models.CharField(blank=True, max_length=24, null=True)),
        AddFieldIfMissing(model_name="tenant", name="preferred_locale", field=models.CharField(choices=[("en", "English"), ("hi", "Hindi"), ("mr", "Marathi")], default="en", max_length=2)),
        AddFieldIfMissing(model_name="tenant", name="marketing_consent", field=models.BooleanField(default=False)),
        AddFieldIfMissing(model_name="tenant", name="dpdp_consent_at", field=models.DateTimeField(blank=True, null=True)),
        AddFieldIfMissing(model_name="tenant", name="share_actions_count", field=models.PositiveIntegerField(default=0)),
    ]

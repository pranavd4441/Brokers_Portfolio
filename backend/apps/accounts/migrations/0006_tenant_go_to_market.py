from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_migrate_tenant_logos")]

    operations = [
        migrations.AddField(model_name="tenant", name="plan_status", field=models.CharField(choices=[("PILOT", "14-day pilot"), ("ACTIVE", "Active paid plan"), ("EXPIRED", "Pilot expired"), ("CANCELLED", "Cancelled")], default="PILOT", max_length=20)),
        migrations.AddField(model_name="tenant", name="pilot_started_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="tenant", name="pilot_ends_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="tenant", name="founding_price_expires_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="tenant", name="acquisition_source", field=models.CharField(blank=True, default="direct", max_length=100)),
        migrations.AddField(model_name="tenant", name="acquisition_city", field=models.CharField(blank=True, default="Pune", max_length=100)),
        migrations.AddField(model_name="tenant", name="referral_code", field=models.CharField(blank=True, max_length=24, null=True, unique=True)),
        migrations.AddField(model_name="tenant", name="referred_by_code", field=models.CharField(blank=True, max_length=24, null=True)),
        migrations.AddField(model_name="tenant", name="preferred_locale", field=models.CharField(choices=[("en", "English"), ("hi", "Hindi"), ("mr", "Marathi")], default="en", max_length=2)),
        migrations.AddField(model_name="tenant", name="marketing_consent", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="tenant", name="dpdp_consent_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="tenant", name="share_actions_count", field=models.PositiveIntegerField(default=0)),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0003_property_properties__status_6427a0_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="property",
            name="status",
            field=models.CharField(
                choices=[
                    ("DRAFT", "Draft / Needs Review"),
                    ("AVAILABLE", "Available"),
                    ("NEGOTIATION", "In Negotiation"),
                    ("SITE_VISIT", "Site Visit Scheduled"),
                    ("BOOKED", "Booked / Token Received"),
                    ("SOLD", "Sold / Closed"),
                    ("EXPIRED", "Expired / Delisted"),
                ],
                default="AVAILABLE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="property",
            name="source",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Created in PropertyOS"),
                    ("WHATSAPP", "Imported from WhatsApp"),
                ],
                db_index=True,
                default="MANUAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="property",
            name="intake_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]

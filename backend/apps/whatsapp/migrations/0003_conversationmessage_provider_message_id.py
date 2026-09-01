from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "whatsapp",
            "0002_whatsappsession_tenant_alter_whatsappsession_state_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="conversationmessage",
            name="provider_message_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]

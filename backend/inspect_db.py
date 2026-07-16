import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "property_os.settings")
django.setup()

from django.contrib.auth import get_user_model

from apps.properties.models import Property
from apps.sharing.models import ShareLink
from apps.whatsapp.models import WhatsAppSession

User = get_user_model()

print("=== USERS ===")
for u in User.objects.all():
    print(
        f"ID: {u.id} | Email: {u.email} | Name: {u.name} | Phone: {u.phone} | Tenant: {u.tenant.name if u.tenant else 'None'}"
    )

print("\n=== PROPERTIES ===")
for p in Property.objects_unfiltered.all():
    print(
        f"ID: {p.id} | Title: {p.title} | Price: {p.price} | Created By: {p.created_by.email if p.created_by else 'None'}"
    )

print("\n=== SHARE LINKS ===")
for s in ShareLink.objects_unfiltered.all():
    print(
        f"ID: {s.id} | Slug: {s.slug} | Property ID: {s.property_id} | Created By: {s.created_by.email if s.created_by else 'None'}"
    )

print("\n=== WHATSAPP SESSIONS ===")
for ws in WhatsAppSession.objects.all():
    print(f"Phone: {ws.phone_number} | State: {ws.state} | Metadata: {ws.metadata}")

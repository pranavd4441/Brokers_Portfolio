import os
import sys
import django

sys.path.append(r'c:\Users\Sanika_JR\.gemini\antigravity-ide\scratch\property-os\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_os.settings')
django.setup()

from apps.whatsapp.models import ConversationMessage

print("--- Latest 5 Conversation Messages ---")
messages = ConversationMessage.objects.all().order_by('-timestamp')[:5]
if not messages:
    print("No messages found in database.")
for msg in messages:
    body = msg.body or '[Media]'
    # Safe printing to avoid Windows console encoding issues
    safe_body = body.encode('ascii', errors='replace').decode('ascii')
    print(f"[{msg.timestamp}] Direction: {msg.direction} | Session: {msg.session.phone_number} | Body: {safe_body}")

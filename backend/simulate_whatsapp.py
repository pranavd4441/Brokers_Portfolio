import os
import sys
import django

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_os.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.whatsapp.models import WhatsAppSession, ConversationMessage
from apps.properties.models import Property
from apps.sharing.models import ShareLink
from rest_framework.test import APIClient

User = get_user_model()

def print_help():
    print("\n--- Available Commands ---")
    print("  create listing : Initialize listing creation wizard")
    print("  cancel / reset : Discard/exit listing creation wizard")
    print("  listings       : View all listings in your inventory")
    print("  available      : View available listings")
    print("  leads          : View today's new leads")
    print("  done           : Finalize and publish listing (when in COLLECTING state)")
    print("  exit / quit    : Exit this simulation script")
    print("--------------------------\n")

def main():
    print("====================================================")
    print("         PropertyOS WhatsApp Simulation Tool        ")
    print("====================================================\n")

    # 1. Resolve User
    users = list(User.objects.all())
    if not users:
        print("No users found in the database. Please sign up or seed data first.")
        return

    print("Select a Broker to simulate:")
    for idx, u in enumerate(users, 1):
        print(f"  [{idx}] {u.name} ({u.email}) - Phone: '{u.phone or 'Not Set'}'")
    
    try:
        sel = int(input("\nEnter selection number: ")) - 1
        user = users[sel]
    except (ValueError, IndexError):
        print("Invalid selection. Exiting.")
        return

    # 2. Configure Phone Number if missing
    phone_number = user.phone
    if not phone_number:
        print(f"\nBroker {user.name} does not have a phone number configured.")
        phone_number = input("Enter a simulated phone number (e.g. +919999999999): ").strip()
        if not phone_number:
            print("Phone number required to simulate. Exiting.")
            return
        user.phone = phone_number
        user.save()
        print(f"✓ Configured user phone number to: {phone_number}")

    # Ensure phone number doesn't have whatsapp prefix for local check
    clean_phone = phone_number.replace('whatsapp:', '').strip()

    # 3. Get or Create Session
    session, _ = WhatsAppSession.objects.get_or_create(phone_number=clean_phone)
    if not session.tenant and user.tenant:
        session.tenant = user.tenant
        session.save()

    print(f"\nSimulating WhatsApp Chat for {user.name} ({clean_phone})...")
    print_help()

    # Track last message ID we've displayed
    last_msg = ConversationMessage.objects.filter(session=session).order_safe_by('id').last() if hasattr(ConversationMessage.objects, 'order_safe_by') else ConversationMessage.objects.filter(session=session).order_by('id').last()
    last_msg_id = last_msg.id if last_msg else 0

    client = APIClient()

    while True:
        try:
            # Print state indicator
            print(f"\n[Session State: \033[94m{session.state}\033[0m]")
            if session.metadata:
                print(f"Current Metadata: {dict(session.metadata)}")
            if session.temp_images:
                print(f"Temp Images Uploaded: {len(session.temp_images)}")

            user_input = input("\nYou: ").strip()
            if not user_input:
                continue

            if user_input.lower() in ['exit', 'quit']:
                print("Exiting simulator.")
                break

            # Send payload to webhook endpoint
            payload = {
                "From": f"whatsapp:{clean_phone}",
                "Body": user_input,
                "NumMedia": "0"
            }
            
            # Post to endpoint
            response = client.post('/api/whatsapp/webhook/', payload)
            
            if response.status_code != 200:
                print(f"API Error ({response.status_code}): {response.data}")
                continue

            # Fetch new OUTBOUND messages
            new_outbound = ConversationMessage.objects.filter(
                session=session,
                direction='OUTBOUND',
                id__gt=last_msg_id
            ).order_by('id')

            for msg in new_outbound:
                print(f"\n\033[92mPropertyOS Bot:\033[0m\n{msg.body}")
                last_msg_id = max(last_msg_id, msg.id)

            session.refresh_from_db()

        except KeyboardInterrupt:
            print("\nExiting simulator.")
            break
        except Exception as e:
            print(f"\nError: {str(e)}")

if __name__ == '__main__':
    main()

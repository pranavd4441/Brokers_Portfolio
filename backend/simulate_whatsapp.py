import os

import django

# Initialize Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "property_os.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.whatsapp.models import ConversationMessage, WhatsAppSession

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
        phone_number = input(
            "Enter a simulated phone number (e.g. +919999999999): "
        ).strip()
        if not phone_number:
            print("Phone number required to simulate. Exiting.")
            return
        user.phone = phone_number
        user.save()
        print(f"✓ Configured user phone number to: {phone_number}")

    # Ensure phone number doesn't have whatsapp prefix for local check
    clean_phone = phone_number.replace("whatsapp:", "").strip()

    # 3. Get or Create Session
    session, _ = WhatsAppSession.objects.get_or_create(phone_number=clean_phone)
    if not session.tenant and user.tenant:
        session.tenant = user.tenant
        session.save()

    print(f"\nSimulating WhatsApp Chat for {user.name} ({clean_phone})...")
    print_help()

    last_msg = (
        ConversationMessage.objects.filter(session=session).order_by("timestamp").last()
    )
    last_timestamp = last_msg.timestamp if last_msg else None

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

            if user_input.lower() in ["exit", "quit"]:
                print("Exiting simulator.")
                break

            if user_input.lower().startswith("image"):
                url = user_input.replace("image:", "").replace("image", "").strip()
                # Provide a default real estate image if they just type "image"
                if not url:
                    url = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"

                print(f"\n[Simulating Uploading Image: {url}]")
                payload = {
                    "From": f"whatsapp:{clean_phone}",
                    "Body": "",
                    "NumMedia": "1",
                    "MediaUrl0": url,
                    "MediaContentType0": "image/jpeg",
                }
            else:
                # Send text payload to webhook endpoint
                payload = {
                    "From": f"whatsapp:{clean_phone}",
                    "Body": user_input,
                    "NumMedia": "0",
                }

            # Post to endpoint
            response = client.post("/api/whatsapp/webhook/", payload)

            if response.status_code != 200:
                print(f"API Error ({response.status_code}): {response.data}")
                continue

            # Fetch new OUTBOUND messages
            qs = ConversationMessage.objects.filter(
                session=session, direction="OUTBOUND"
            )
            if last_timestamp:
                qs = qs.filter(timestamp__gt=last_timestamp)
            new_outbound = qs.order_by("timestamp")

            for msg in new_outbound:
                print(f"\n\033[92mPropertyOS Bot:\033[0m\n{msg.body}")
                if not last_timestamp or msg.timestamp > last_timestamp:
                    last_timestamp = msg.timestamp

            session.refresh_from_db()

        except KeyboardInterrupt:
            print("\nExiting simulator.")
            break
        except Exception as e:
            print(f"\nError: {str(e)}")


if __name__ == "__main__":
    main()

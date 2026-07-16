import os
import sys

sys.path.append(r'c:\Users\Sanika_JR\.gemini\antigravity-ide\scratch\property-os\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_os.settings')

import django
django.setup()

from apps.accounts.models import User

try:
    user = User.objects.filter(email='pranavd4441@gmail.com').first()
    if user:
        user.phone = '+919370931691'
        user.save()
        print(f"Successfully updated user {user.email} phone number to {user.phone}")
    else:
        print("User pranavd4441@gmail.com not found. Attempting to update first user...")
        user = User.objects.first()
        if user:
            user.phone = '+919370931691'
            user.save()
            print(f"Successfully updated user {user.email} phone number to {user.phone}")
        else:
            print("No users found in database.")
except Exception as e:
    print(f"Error updating database: {e}")

import os
import sys

# 1. Update .env
env_path = r'c:\Users\Sanika_JR\.gemini\antigravity-ide\scratch\property-os\.env'
with open(env_path, 'a') as f:
    f.write('\n# TWILIO CONFIG\n')
    f.write('WHATSAPP_GATEWAY_PROVIDER=TWILIO\n')
    f.write('TWILIO_ACCOUNT_SID=your_twilio_account_sid\n')
    f.write('TWILIO_AUTH_TOKEN=your_twilio_auth_token\n')
    f.write('TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886\n')
print(".env updated successfully. Please fill in the actual keys in your local .env file.")

# 2. Update Database
sys.path.append(r'c:\Users\Sanika_JR\.gemini\antigravity-ide\scratch\property-os\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_os.settings')

import django
django.setup()

from apps.accounts.models import User
user = User.objects.first()
if user:
    user.phone = '+918855023247'
    user.save()
    print(f"Updated user {user.email} phone to +918855023247")
else:
    print("No users found in database.")

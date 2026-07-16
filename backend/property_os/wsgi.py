import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_os.settings')

# Validate required production/staging environment variables at runtime startup
from property_os.config import validate_environment
validate_environment()

application = get_wsgi_application()

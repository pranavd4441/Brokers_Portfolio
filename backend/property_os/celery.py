import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'property_os.settings')

# Validate required production/staging environment variables at runtime startup
from property_os.config import validate_environment
validate_environment()

app = Celery('property_os')

# Read config from Django settings using CELERY_ namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks in all registered Django apps
app.autodiscover_tasks()

# Register logging propagation hooks
import property_os.celery_logging


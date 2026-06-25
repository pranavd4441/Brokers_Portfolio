# property_os/__init__.py
# NOTE: Celery app import removed from here to prevent wsgi loading failures
# when Celery/Redis is not available in local dev.
# The celery.py module is still used by the Celery worker directly.

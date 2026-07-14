import os
from django.core.exceptions import ImproperlyConfigured

def validate_environment():
    """
    Validates required environment variables at startup.
    Fails fast in production/staging environments.
    """
    env = os.getenv('DJANGO_ENVIRONMENT', 'development').lower()
    is_prod_or_staging = env in ('production', 'staging')

    # Basic essential settings for all envs
    required_basics = {
        'DJANGO_SECRET_KEY': 'SECRET_KEY',
    }

    # Production-only critical settings
    required_production = {
        'DATABASE_URL': 'DATABASE_URL',
        'JWT_SECRET_KEY': 'JWT_SECRET',
        'SENTRY_DSN': 'SENTRY_DSN',
        'REDIS_URL': 'REDIS_URL',
        'AWS_ACCESS_KEY_ID': 'STORAGE_KEYS (AWS_ACCESS_KEY_ID)',
        'AWS_SECRET_ACCESS_KEY': 'STORAGE_KEYS (AWS_SECRET_ACCESS_KEY)',
        'AWS_STORAGE_BUCKET_NAME': 'STORAGE_KEYS (AWS_STORAGE_BUCKET_NAME)',
        'WHATSAPP_ACCESS_TOKEN': 'WHATSAPP_KEYS (WHATSAPP_ACCESS_TOKEN)',
        'WHATSAPP_PHONE_NUMBER_ID': 'WHATSAPP_KEYS (WHATSAPP_PHONE_NUMBER_ID)',
        'GEMINI_API_KEY': 'GEMINI_API_KEY',
    }

    missing_basics = [logical_name for env_var, logical_name in required_basics.items() if not os.getenv(env_var)]
    missing_prod = [logical_name for env_var, logical_name in required_production.items() if not os.getenv(env_var)]

    if missing_basics:
        error_msg = f"Critical environment variables are missing at startup: {', '.join(missing_basics)}. The application cannot start."
        raise ImproperlyConfigured(error_msg)

    # SECURE_KEY shouldn't be the default insecure key in prod
    secret_key = os.getenv('DJANGO_SECRET_KEY', '')
    if is_prod_or_staging and (not secret_key or secret_key.startswith('django-insecure')):
        raise ImproperlyConfigured("Insecure DJANGO_SECRET_KEY configured in production/staging environment.")

    if is_prod_or_staging and missing_prod:
        error_msg = (
            f"Production environment validation failed. Missing required environment variables: {', '.join(missing_prod)}. "
            "Application startup aborted to prevent unconfigured operations in production/staging."
        )
        raise ImproperlyConfigured(error_msg)

import logging
import os

from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


def validate_environment():
    """
    Validates environment variables at runtime startup.

    Three-tier strategy:
    - CORE: Application cannot function at all without these. Hard block.
    - IMPORTANT: Core DB/auth infrastructure. Hard block in production.
    - OPTIONAL FEATURES: Gracefully degrade if missing. Warn only.

    This function is called from wsgi.py and celery.py only — never at
    import time — so it never runs during Docker build steps like collectstatic.
    """
    env = os.getenv("DJANGO_ENVIRONMENT", "development").lower()
    is_prod_or_staging = env in ("production", "staging")

    # -----------------------------------------------------------------------
    # TIER 1: Core — required in ALL environments (blocks startup everywhere)
    # -----------------------------------------------------------------------
    core_required = {
        "DJANGO_SECRET_KEY": "SECRET_KEY",  # nosec B105
    }

    missing_core = [
        logical_name
        for env_var, logical_name in core_required.items()
        if not os.getenv(env_var)
    ]

    if missing_core:
        raise ImproperlyConfigured(
            f"Critical environment variables are missing: {', '.join(missing_core)}. "
            "The application cannot start."
        )

    # Reject the insecure fallback key in production/staging
    secret_key = os.getenv("DJANGO_SECRET_KEY", "")
    if is_prod_or_staging and secret_key.startswith("django-insecure"):
        raise ImproperlyConfigured(
            "Insecure DJANGO_SECRET_KEY is set in a production/staging environment. "
            "Generate a secure key and set it as an environment variable."
        )

    # -----------------------------------------------------------------------
    # TIER 2: Important — required in production/staging (hard block)
    # These enable the fundamental runtime: database and JWT auth.
    # -----------------------------------------------------------------------
    production_required = {
        "DATABASE_URL": "DATABASE_URL",  # nosec B105
        "JWT_SECRET_KEY": "JWT_SECRET_KEY",  # nosec B105
    }

    if is_prod_or_staging:
        missing_production = [
            logical_name
            for env_var, logical_name in production_required.items()
            if not os.getenv(env_var)
        ]

        for desc in missing_production:
            logger.error(
                f"[PropertyOS] CRITICAL PRODUCTION ERROR: Missing environment variable for {desc}"
            )

        if missing_production:
            raise ImproperlyConfigured(
                f"Missing {len(missing_production)} production environment variables."
            )

    # -----------------------------------------------------------------------
    # TIER 3: Optional features — warn if missing, never block startup.
    # These enable specific product features and degrade gracefully when absent.
    # -----------------------------------------------------------------------
    optional_features = {
        "REDIS_URL": "Redis / Celery (async tasks will run synchronously)",
        "AWS_ACCESS_KEY_ID": "Object Storage / S3 (media uploads use local disk fallback)",  # nosec B105
        "AWS_SECRET_ACCESS_KEY": "Object Storage / S3 (media uploads use local disk fallback)",  # nosec B105
        "AWS_STORAGE_BUCKET_NAME": "Object Storage / S3 (media uploads use local disk fallback)",  # nosec B105
        "WHATSAPP_ACCESS_TOKEN": "WhatsApp Integration (messaging disabled)",  # nosec B105
        "WHATSAPP_PHONE_NUMBER_ID": "WhatsApp Integration (messaging disabled)",  # nosec B105
        "GEMINI_API_KEY": "Gemini AI (AI features disabled)",  # nosec B105
        "SENTRY_DSN": "Sentry (error tracking disabled)",  # nosec B105
    }

    if is_prod_or_staging:
        for env_var, description in optional_features.items():
            if not os.getenv(env_var):
                logger.warning(
                    "[PropertyOS] Optional feature not configured: %s — %s",
                    env_var,
                    description,
                )

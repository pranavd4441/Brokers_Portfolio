import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

import sys
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Load environment variables from .env file if it exists
load_dotenv(os.path.join(BASE_DIR.parent, '.env'))

# Validate required variables at startup will be executed at WSGI/Celery runtime entrypoints.

# Sentry SDK Integration
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

def sentry_before_send(event, hint):
    if 'request' in event:
        req = event['request']
        if 'headers' in req:
            headers = req['headers']
            sensitive = {'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-csrf-token'}
            for h in list(headers.keys()):
                if h.lower() in sensitive:
                    headers[h] = '[REDACTED]'
        if 'data' in req:
            data = req['data']
            if isinstance(data, dict):
                sensitive_keys = {'password', 'token', 'access_token', 'refresh_token', 'secret', 'client_secret'}
                for k in list(data.keys()):
                    if any(s in k.lower() for s in sensitive_keys):
                        data[k] = '[REDACTED]'
    return event

SENTRY_DSN = os.getenv('SENTRY_DSN')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        environment=os.getenv('DJANGO_ENVIRONMENT', 'development'),
        release=os.getenv('RELEASE_VERSION', '1.0.0'),
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        send_default_pii=False,
        before_send=sentry_before_send,
    )



SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-fallback-key-change-in-prod!')

DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
if DEBUG and 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third Party Apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'storages',
    
    # PropertyOS Core Apps
    'apps.accounts',
    'apps.properties',
    'apps.media',
    'apps.sharing',
    'apps.analytics',
    'apps.audit',
    'apps.whatsapp',
    'apps.leads',
]

MIDDLEWARE = [
    'property_os.middleware.RequestIDMiddleware',
    'property_os.middleware.ApiPayloadLimitMiddleware',
    'property_os.middleware.ContentTypeValidationMiddleware',
    'property_os.middleware.GlobalExceptionMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.accounts.middleware.TenantMiddleware',
    'property_os.middleware.TenantContextLoggingMiddleware',
    'property_os.middleware.StructuredLoggingMiddleware',
    'apps.accounts.middleware.ApiSlashMiddleware',
    'property_os.middleware.SecurityHeadersMiddleware',
]


ROOT_URLCONF = 'property_os.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'property_os.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases
_DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{BASE_DIR}/db.sqlite3')
_IS_POSTGRES = _DATABASE_URL.startswith(('postgres://', 'postgresql://'))

DATABASES = {
    'default': dj_database_url.config(
        default=_DATABASE_URL,
        conn_max_age=600,
        # ssl_require must only be set for PostgreSQL — SQLite has no SSL support
        # and passing sslmode crashes with TypeError on connection.
        ssl_require=_IS_POSTGRES and not DEBUG
    )
}

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 10,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'apps.accounts.password_validation.ComplexityValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- CORS SETTINGS ---
CORS_ALLOWED_ORIGINS = os.getenv('DJANGO_CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', 'http://localhost:3000').split(',')

# --- DJANGO REST FRAMEWORK CONFIG ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('THROTTLE_ANON_RATE', '100/day'),
        'user': os.getenv('THROTTLE_USER_RATE', '1000/day'),
        'webhook': os.getenv('THROTTLE_WEBHOOK_RATE', '100/minute'),
        'public': os.getenv('THROTTLE_PUBLIC_RATE', '60/minute'),
        'admin': os.getenv('THROTTLE_ADMIN_RATE', '5000/day'),
    },
    'EXCEPTION_HANDLER': 'property_os.throttling.custom_exception_handler',
}

# --- SIMPLE JWT CONFIG ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': os.getenv('JWT_SECRET_KEY', SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    # Custom token serializer to inject tenant_id and role
    'TOKEN_OBTAIN_SERIALIZER': 'apps.accounts.serializers.CustomTokenObtainPairSerializer',
}

# --- CELERY HARDENED CONFIG ---
_REDIS_URL = os.getenv('REDIS_URL', '')
CELERY_BROKER_URL = _REDIS_URL or 'memory://'
CELERY_RESULT_BACKEND = _REDIS_URL or 'cache+memory://'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ALWAYS_EAGER = not bool(_REDIS_URL)

# Timeouts & Limits
CELERY_TASK_TIME_LIMIT = 300       # 5 minutes hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes soft limit
CELERY_TASK_ACKS_LATE = True       # Re-queue on unexpected worker termination

# Task Distribution
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Distribute heavy work evenly

# Queue Prioritization & Routing
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_ROUTES = {
    'apps.media.tasks.*': {'queue': 'media'},
    'apps.whatsapp.tasks.*': {'queue': 'whatsapp'},
}

# --- OBJECT STORAGE CONFIG (S3 / CLOUDFLARE R2) ---
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL')

if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
    # Use django-storages S3Backend
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    # Cloudflare R2 specific endpoint adjustment
    if AWS_S3_ENDPOINT_URL:
        AWS_S3_CUSTOM_DOMAIN = None
    print("[PropertyOS] Object Storage Configured: Using S3/R2 Backend.")
else:
    # Fallback to Local Directory Storage
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    print("[PropertyOS] Object Storage NOT Configured: Using Local Filesystem Fallback.")

# --- WHATSAPP & GEMINI SERVICES CONFIG ---
WHATSAPP_GATEWAY_PROVIDER = os.getenv('WHATSAPP_GATEWAY_PROVIDER', 'MOCK')
WHATSAPP_VERIFY_TOKEN = os.getenv('WHATSAPP_VERIFY_TOKEN', 'propertyos-webhook-verify-token')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_NUMBER = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
WHATSAPP_ACCESS_TOKEN = os.getenv('WHATSAPP_ACCESS_TOKEN', '')
WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')


# --- HTTPS & SECURITY SAAS HARDENING ---
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000 # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'same-origin'

# --- SECURE COOKIES ---
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# --- LOGGING CONFIGURATION ---
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'property_os.logging.JSONFormatter',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'loggers': {
        '': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'application': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'whatsapp': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'analytics': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'middleware': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}




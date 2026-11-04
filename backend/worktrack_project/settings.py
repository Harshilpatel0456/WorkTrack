"""
Django settings for WorkTrack Enterprise API.
"""

from pathlib import Path
from datetime import timedelta
import sys
from decouple import config, Csv
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Add apps directory to sys.path
sys.path.insert(0, str(BASE_DIR))

# Core Security Settings
DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY', default='')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-local-development-only'
    else:
        raise ImproperlyConfigured('SECRET_KEY must be configured when DEBUG is disabled.')
if not DEBUG and (
    len(SECRET_KEY) < 50
    or SECRET_KEY.startswith(('django-insecure-', 'replace-', 'change-me'))
):
    raise ImproperlyConfigured('Production SECRET_KEY must be a unique, random value of at least 50 characters.')

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1' if DEBUG else '',
    cast=Csv(),
)
if not DEBUG and (not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS):
    raise ImproperlyConfigured('Production ALLOWED_HOSTS must contain explicit hostnames.')

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'whitenoise.runserver_nostatic',

    # Third-Party Libraries
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # WorkTrack Modular Business Apps
    'apps.accounts',
    'apps.employees',
    'apps.customers',
    'apps.assignments',
    'apps.shifts',
    'apps.attendance',
    'apps.reports',
    'apps.feedback',
    'apps.notifications',
    'apps.audit',
    'apps.surveillance',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Top of middleware for CORS headers
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

ROOT_URLCONF = 'worktrack_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

WSGI_APPLICATION = 'worktrack_project.wsgi.application'

# Database Configuration
DB_ENGINE = config('DB_ENGINE', default='postgresql')
if DB_ENGINE not in ('postgresql', 'sqlite3'):
    raise ImproperlyConfigured('DB_ENGINE must be either postgresql or sqlite3.')
if not DEBUG and DB_ENGINE != 'postgresql':
    raise ImproperlyConfigured('Production requires PostgreSQL.')

if DB_ENGINE == 'postgresql':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='worktrack_db' if DEBUG else None),
            'USER': config('DB_USER', default='worktrack_user' if DEBUG else None),
            'PASSWORD': config('DB_PASSWORD', default='worktrack_user' if DEBUG else None),
            'HOST': config('DB_HOST', default='127.0.0.1'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization & Timezone
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media Files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_RATES': {
        'login': config('LOGIN_RATE_LIMIT', default='5/minute'),
        'registration': config('REGISTRATION_RATE_LIMIT', default='5/hour'),
        'password_reset': config('PASSWORD_RESET_RATE_LIMIT', default='3/hour'),
        'password_reset_confirm': config('PASSWORD_RESET_CONFIRM_RATE_LIMIT', default='10/hour'),
    },
}

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config(
        'JWT_ACCESS_MINUTES', default=60 if DEBUG else 15, cast=int
    )),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173' if DEBUG else '',
    cast=Csv()
)
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173' if DEBUG else '',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = False

FRONTEND_URL = config(
    'FRONTEND_URL',
    default='http://localhost:5173' if DEBUG else '',
)
if not DEBUG:
    if not CORS_ALLOWED_ORIGINS or any(
        not origin.startswith('https://') for origin in CORS_ALLOWED_ORIGINS
    ):
        raise ImproperlyConfigured('Production CORS_ALLOWED_ORIGINS must contain HTTPS origins.')
    if not CSRF_TRUSTED_ORIGINS or any(
        not origin.startswith('https://') for origin in CSRF_TRUSTED_ORIGINS
    ):
        raise ImproperlyConfigured('Production CSRF_TRUSTED_ORIGINS must contain HTTPS origins.')
    if not FRONTEND_URL.startswith('https://'):
        raise ImproperlyConfigured('Production FRONTEND_URL must use HTTPS.')

SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=not DEBUG, cast=bool)
if not DEBUG and not SECURE_SSL_REDIRECT:
    raise ImproperlyConfigured('SECURE_SSL_REDIRECT cannot be disabled in production.')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000 if not DEBUG else 0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config(
    'SECURE_HSTS_INCLUDE_SUBDOMAINS', default=not DEBUG, cast=bool
)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# OpenAPI / Swagger Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'WorkTrack Enterprise REST API',
    'DESCRIPTION': 'Workforce allocation, daily shift reporting, biometric attendance, and hourly CCTV AI audit telemetry.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Celery Configuration
CELERY_BROKER_URL = config(
    'CELERY_BROKER_URL',
    default='redis://127.0.0.1:6379/0' if DEBUG else None,
)
CELERY_RESULT_BACKEND = config(
    'REDIS_URL',
    default='redis://127.0.0.1:6379/0' if DEBUG else None,
)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULE = {
    'process-notification-digests-every-minute': {
        'task': 'apps.notifications.tasks.process_due_digests',
        'schedule': crontab(minute='*'),
    },
}

# Email Configuration
EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend' if DEBUG
    else 'django.core.mail.backends.smtp.EmailBackend',
)
DEFAULT_FROM_EMAIL = config(
    'DEFAULT_FROM_EMAIL',
    default='notifications@worktrack.demo' if DEBUG else None,
)
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=10, cast=int)
if not DEBUG and (
    EMAIL_BACKEND != 'django.core.mail.backends.smtp.EmailBackend'
    or not EMAIL_HOST
    or not DEFAULT_FROM_EMAIL
    or EMAIL_USE_TLS == EMAIL_USE_SSL
):
    raise ImproperlyConfigured(
        'Production email requires SMTP, a host, a sender, and exactly one of TLS or SSL.'
    )

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} [{asctime}] {module}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': config('DJANGO_LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
}

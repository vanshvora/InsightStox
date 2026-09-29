"""
Django settings for insightstox project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-me-in-production')

DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Local apps
    'users',
    'portfolio',
    'dashboard',
    'ai_insight',
    'feedback',
    'jobs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'

# Database — single Neon PostgreSQL
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
    )
}

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.CookieTokenAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# CORS
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.environ.get('FRONTEND_LINK', 'http://localhost:5173').split(',')
]
CORS_ALLOW_CREDENTIALS = True

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'insightstox_cache',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---- External Service Config ----
# Cloudinary
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')

# Brevo Email
BREVO_API_KEY = os.environ.get('brevo_API')
SENDER_EMAIL = os.environ.get('GOOGLE_USER_EMAIL', 'noreply@insightstox.com')

# Groq AI
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'openai/gpt-oss-120b')

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

# JigsawStack
JIGSAWSTACK_API_KEY = os.environ.get('JIGSAWSTACK_API_KEY')

# Exchange Rate
RATE_EXCHANGE_URL = os.environ.get('RATE_EXCHANGE', 'https://api.frankfurter.dev/v1/latest?base=INR')

# LangChain
LANGCHAIN_TRACING_V2 = os.environ.get('LANGCHAIN_TRACING_V2', 'false')
LANGCHAIN_API_KEY = os.environ.get('LANGCHAIN_API_KEY', '')
LANGCHAIN_PROJECT = os.environ.get('LANGCHAIN_PROJECT', 'InsightStox')

# File upload limits
MAX_UPLOAD_SIZE = 500 * 1024  # 500KB

# Media files (temp uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

LOGFIRE_TOKEN = os.environ.get('LOGFIRE_TOKEN', '')
LOGFIRE_SERVICE_NAME = os.environ.get('LOGFIRE_SERVICE_NAME', 'insightstox-backend')
LOGFIRE_ENVIRONMENT = os.environ.get('LOGFIRE_ENVIRONMENT', os.environ.get('ENV', 'development'))

try:
    from .logfire_setup import setup_logfire
    setup_logfire()
except Exception:
    pass

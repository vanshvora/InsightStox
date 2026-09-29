import os

import logfire


_configured = False


def setup_logfire():
    global _configured
    if _configured:
        return True

    token = os.environ.get("LOGFIRE_TOKEN", "")
    if not token:
        return False

    service = os.environ.get("LOGFIRE_SERVICE_NAME", "insightstox-backend")
    env = os.environ.get("LOGFIRE_ENVIRONMENT", os.environ.get("ENV", "development"))

    os.environ.setdefault("OTEL_PYTHON_DJANGO_EXCLUDED_URLS", "health,token/check,admin/jsi18n")
    os.environ.setdefault("OTEL_PYTHON_REQUESTS_EXCLUDED_URLS", "health")
    os.environ.setdefault("OTEL_PYTHON_HTTPX_EXCLUDED_URLS", "health")

    logfire.configure(
        token=token,
        service_name=service,
        environment=env,
    )

    try:
        logfire.instrument_django(excluded_urls="health,token/check,admin/jsi18n")
    except Exception:
        pass
    try:
        logfire.instrument_requests(excluded_urls="health")
    except Exception:
        pass
    try:
        logfire.instrument_httpx(excluded_urls="health")
    except Exception:
        pass
    try:
        logfire.instrument_psycopg()
    except Exception:
        pass

    _configured = True
    return True


def get_logger(name="insightstox"):
    return logfire

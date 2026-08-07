from django.apps import AppConfig
import os

class JobsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jobs'

    def ready(self):
        # Prevent scheduler from running multiple times in dev server
        if os.environ.get('RUN_MAIN', None) != 'true':
            from .scheduler import start_scheduler
            start_scheduler()

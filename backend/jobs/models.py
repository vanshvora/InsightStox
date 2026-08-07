from django.db import models


class JobMeta(models.Model):
    """Tracks last run time of periodic jobs."""

    job_name = models.CharField(max_length=255, unique=True)
    last_run = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job_name} - last run: {self.last_run}"

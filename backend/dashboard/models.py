from django.db import models

class GlobalMarketData(models.Model):
    DATA_TYPE_CHOICES = [
        ('GAINERS', 'Market Gainers'),
        ('LOSERS', 'Market Losers'),
        ('ACTIVE', 'Most Active'),
        ('NEWS', 'Market News'),
    ]

    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, unique=True)
    payload = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_data_type_display()} (Updated: {self.updated_at})"

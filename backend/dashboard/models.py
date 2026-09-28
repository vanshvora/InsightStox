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


class PriceAlert(models.Model):
    CONDITION_CHOICES = [
        ('ABOVE', 'Above'),
        ('BELOW', 'Below'),
    ]

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='price_alerts'
    )
    stock = models.ForeignKey(
        'portfolio.Stock', on_delete=models.CASCADE, related_name='price_alerts'
    )
    target_price = models.DecimalField(max_digits=18, decimal_places=2)
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)
    is_active = models.BooleanField(default=True)
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'stock', 'condition')

    def __str__(self):
        return f"{self.user.email} - {self.stock.symbol} {self.condition} {self.target_price}"

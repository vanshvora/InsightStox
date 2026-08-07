from django.db import models


class Stock(models.Model):
    """Reference table caching Yahoo Finance stock data."""

    symbol = models.CharField(max_length=100, unique=True)
    short_name = models.CharField(max_length=255, blank=True, null=True)
    long_name = models.CharField(max_length=255, blank=True, null=True)
    sector = models.CharField(max_length=100, blank=True, null=True)
    currency = models.CharField(max_length=10, blank=True, null=True)
    stock_type = models.CharField(max_length=50, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    exchange = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.symbol} - {self.short_name}"


class StockSummary(models.Model):
    """Current holdings for each user-stock pair."""

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='stock_summaries'
    )
    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name='summaries'
    )
    current_holding = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    spent_amount = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    avg_price = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    realized_gain = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    yesterday_holding = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    class Meta:
        unique_together = ('user', 'stock')

    def __str__(self):
        return f"{self.user.email} - {self.stock.symbol}: {self.current_holding}"


class UserTransaction(models.Model):
    """Buy/Sell transaction history."""

    TRANSACTION_TYPES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='transactions'
    )
    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name='transactions'
    )
    quantity = models.DecimalField(max_digits=18, decimal_places=4)
    price = models.DecimalField(max_digits=18, decimal_places=4)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    transaction_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} {self.transaction_type} {self.quantity} {self.stock.symbol}"


class UserWatchlist(models.Model):
    """User's watchlist of stocks they want to track."""

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='watchlist'
    )
    stock = models.ForeignKey(
        Stock, on_delete=models.CASCADE, related_name='watchlist_entries'
    )

    class Meta:
        unique_together = ('user', 'stock')

    def __str__(self):
        return f"{self.user.email} watching {self.stock.symbol}"


class PortfolioValuationDaily(models.Model):
    """Daily snapshot of portfolio total valuation."""

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='daily_valuations'
    )
    portfolio_valuation = models.DecimalField(max_digits=18, decimal_places=2)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.email} - {self.date}: {self.portfolio_valuation}"


class PortfolioValuationHourly(models.Model):
    """Hourly snapshot of portfolio total valuation."""

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='hourly_valuations'
    )
    portfolio_valuation = models.DecimalField(max_digits=18, decimal_places=2)
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'timestamp')

    def __str__(self):
        return f"{self.user.email} - {self.timestamp}: {self.portfolio_valuation}"

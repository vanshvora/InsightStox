from django.contrib import admin
from .models import (
    Stock, StockSummary, UserTransaction,
    UserWatchlist, PortfolioValuationDaily, PortfolioValuationHourly
)

admin.site.register(Stock)
admin.site.register(StockSummary)
admin.site.register(UserTransaction)
admin.site.register(UserWatchlist)
admin.site.register(PortfolioValuationDaily)
admin.site.register(PortfolioValuationHourly)

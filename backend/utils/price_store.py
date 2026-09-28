import time
import requests
from django.core.cache import cache


class PriceStore:
    """Distributed cache for stock prices to reduce Yahoo Finance API calls."""
    
    def __init__(self):
        self._ttl = 15 * 60  # 15 minutes in seconds
        
    def get(self, symbol):
        return cache.get(f"stock_price_{symbol}")
        
    def set(self, symbol, price):
        cache.set(f"stock_price_{symbol}", price, timeout=self._ttl)
        
    def clear(self):
        pass

class FundamentalStore:
    """Distributed cache for slow fundamental data (EPS, Dividends)."""
    
    def __init__(self):
        self._ttl = 24 * 60 * 60  # 24 hours
        
    def get(self, symbol):
        return cache.get(f"stock_fundamentals_{symbol}")
        
    def set(self, symbol, data):
        cache.set(f"stock_fundamentals_{symbol}", data, timeout=self._ttl)

fundamental_store = FundamentalStore()

# Global singleton
price_store = PriceStore()



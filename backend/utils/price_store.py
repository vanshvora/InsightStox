import time
import requests

class PriceStore:
    """In-memory cache for stock prices to reduce Yahoo Finance API calls."""
    
    def __init__(self):
        self._store = {}
        self._ttl = 15 * 60  # 15 minutes in seconds
        
    def get(self, symbol):
        data = self._store.get(symbol)
        if not data:
            return None
            
        # Check if expired
        if time.time() - data['timestamp'] > self._ttl:
            del self._store[symbol]
            return None
            
        return data['price']
        
    def set(self, symbol, price):
        self._store[symbol] = {
            'price': price,
            'timestamp': time.time()
        }
        
    def clear(self):
        self._store.clear()

# Global singleton
price_store = PriceStore()


class CurrencyStore:
    """In-memory cache for currency exchange rates."""
    
    def __init__(self):
        self._store = {}
        self._ttl = 24 * 60 * 60  # 24 hours
        
    def get_rate(self, currency):
        if currency == 'INR':
            return 1.0
            
        data = self._store.get(currency)
        if data and (time.time() - data['timestamp'] < self._ttl):
            return data['rate']
            
        # Fetch new rate
        try:
            from django.conf import settings
            res = requests.get(settings.RATE_EXCHANGE_URL, timeout=5)
            rates = res.json().get('rates', {})
            rate = rates.get(currency)
            if rate:
                # API returns e.g. 1 INR = 0.012 USD
                # We need multiplier to convert USD to INR, so 1 / rate
                multiplier = 1.0 / rate
                self._store[currency] = {
                    'rate': multiplier,
                    'timestamp': time.time()
                }
                return multiplier
        except Exception as e:
            print(f"Error fetching exchange rate for {currency}: {e}")
            
        return 1.0  # Fallback

# Global singleton
currency_store = CurrencyStore()

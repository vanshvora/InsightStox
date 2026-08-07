from decimal import Decimal
from django.db.models import Sum, F

from portfolio.models import StockSummary, UserTransaction, PortfolioValuationDaily, PortfolioValuationHourly, Stock
from utils.price_store import price_store, currency_store
from utils.yahoo_finance import get_quotes

def get_current_portfolio_valuation(user):
    """
    Calculates the real-time valuation of the user's portfolio.
    Fetches latest prices from Yahoo Finance for all held stocks.
    """
    holdings = StockSummary.objects.filter(user=user, current_holding__gt=0).select_related('stock')
    
    if not holdings.exists():
        return Decimal('0.00')
        
    symbols = [h.stock.symbol for h in holdings]
    
    # Check cache first for prices
    prices = {}
    missing_symbols = []
    
    for symbol in symbols:
        price = price_store.get(symbol)
        if price:
            prices[symbol] = price
        else:
            missing_symbols.append(symbol)
            
    # Fetch missing prices from YF
    if missing_symbols:
        quotes = get_quotes(missing_symbols)
        for quote in quotes:
            sym = quote['symbol']
            try:
                price = float(quote['price'])
                price_store.set(sym, price)
                prices[sym] = price
            except:
                pass
                
    total_valuation = Decimal('0.00')
    
    for holding in holdings:
        sym = holding.stock.symbol
        currency = holding.stock.currency or 'USD'
        
        # Default price if fetch fails
        current_price = prices.get(sym)
        if not current_price:
            current_price = float(holding.avg_price)
            
        # Convert to INR if needed
        exchange_rate = currency_store.get_rate(currency)
        inr_price = current_price * exchange_rate
        
        value = holding.current_holding * Decimal(str(inr_price))
        total_valuation += value
        
    return total_valuation.quantize(Decimal('0.01'))


def calculate_stock_allocation(user):
    """
    Calculates portfolio allocation by sector.
    """
    holdings = StockSummary.objects.filter(user=user, current_holding__gt=0).select_related('stock')
    
    if not holdings.exists():
        return []
        
    symbols = [h.stock.symbol for h in holdings]
    
    prices = {}
    missing_symbols = []
    
    for symbol in symbols:
        price = price_store.get(symbol)
        if price:
            prices[symbol] = price
        else:
            missing_symbols.append(symbol)
            
    if missing_symbols:
        quotes = get_quotes(missing_symbols)
        for quote in quotes:
            sym = quote['symbol']
            try:
                price = float(quote['price'])
                price_store.set(sym, price)
                prices[sym] = price
            except:
                pass
                
    sector_values = {}
    total_value = Decimal('0.00')
    
    for holding in holdings:
        sym = holding.stock.symbol
        sector = holding.stock.sector or 'Other'
        currency = holding.stock.currency or 'USD'
        
        current_price = prices.get(sym, float(holding.avg_price))
        exchange_rate = currency_store.get_rate(currency)
        inr_price = current_price * exchange_rate
        
        value = holding.current_holding * Decimal(str(inr_price))
        
        if sector in sector_values:
            sector_values[sector] += value
        else:
            sector_values[sector] = value
            
        total_value += value
        
    if total_value == 0:
        return []
        
    allocation = []
    for sector, value in sector_values.items():
        percentage = (value / total_value) * 100
        allocation.append({
            'sector': sector,
            'percentage': float(percentage.quantize(Decimal('0.01'))),
            'value': float(value.quantize(Decimal('0.01')))
        })
        
    # Sort by percentage descending
    allocation.sort(key=lambda x: x['percentage'], reverse=True)
    
    return allocation

from decimal import Decimal
from django.db.models import Sum, F

from portfolio.models import StockSummary, UserTransaction, PortfolioValuationDaily, PortfolioValuationHourly, Stock
from utils.price_store import price_store
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
    
    # Read strictly from the cache store
    prices = {}
    for symbol in symbols:
        price = price_store.get(symbol)
        if price:
            prices[symbol] = price
                
    total_valuation = Decimal('0.00')
    
    for holding in holdings:
        sym = holding.stock.symbol
        current_price = prices.get(sym)
        if not current_price:
            current_price = float(holding.avg_price)
        value = holding.current_holding * Decimal(str(current_price))
        total_valuation += value
        
    return total_valuation.quantize(Decimal('0.01'))

def get_current_portfolio_profit_loss(user):
    """
    Calculates the real-time profit/loss of the user's portfolio.
    Includes both unrealized P/L from active holdings and realized gains from past sales.
    """
    # Fetch ALL summaries, even those with 0 holdings (for realized gains)
    holdings = StockSummary.objects.filter(user=user).select_related('stock')
    
    if not holdings.exists():
        return Decimal('0.00')
        
    symbols = [h.stock.symbol for h in holdings if h.current_holding > 0]
    
    # Read from the cache store first
    prices = {}
    missing_symbols = []
    if symbols:
        for symbol in symbols:
            price = price_store.get(symbol)
            if price:
                prices[symbol] = price
            else:
                missing_symbols.append(symbol)
                
    # Fetch missing prices from Yahoo Finance
    if missing_symbols:
        quotes = get_quotes(missing_symbols)
        for q in quotes:
            sym = q.get('symbol')
            current_p = q.get('price')
            if sym and current_p and current_p != 'N/A':
                prices[sym] = current_p
                price_store.set(sym, current_p)
                
    total_pl = Decimal('0.00')
    
    for holding in holdings:
        sym = holding.stock.symbol
        if holding.current_holding > 0:
            current_price = prices.get(sym)
            if not current_price:
                current_price = float(holding.avg_price)
            value = holding.current_holding * Decimal(str(current_price))
            spent = holding.spent_amount if hasattr(holding, 'spent_amount') else holding.current_holding * Decimal(str(holding.avg_price))
            unrealized_pl = value - spent
        else:
            unrealized_pl = Decimal('0.00')
            
        realized_pl = holding.realized_gain if hasattr(holding, 'realized_gain') else Decimal('0.00')
        total_pl += (unrealized_pl + realized_pl)
        
    return total_pl.quantize(Decimal('0.01'))


def get_cost_basis_by_date(user):
    """
    Replay buy/sell transactions in chronological order with average costing,
    mirroring portfolio.services add_buy/add_sell. Returns ({date_iso: total
    cost basis at end of that day}, {date_iso: cumulative realized gain}).
    """
    from django.utils import timezone
    from portfolio.models import UserTransaction

    per_stock = {}
    daily_basis = {}
    daily_realized = {}
    realized_total = Decimal('0')
    txs = UserTransaction.objects.filter(user=user).order_by('transaction_date', 'id')
    for tx in txs:
        qty = Decimal(str(tx.quantity))
        if tx.transaction_type == 'BUY':
            entry = per_stock.setdefault(tx.stock_id, [Decimal('0'), Decimal('0')])
            entry[0] += qty
            entry[1] += qty * Decimal(str(tx.price))
        else:
            entry = per_stock.get(tx.stock_id)
            if entry and entry[0] > 0:
                avg = entry[1] / entry[0]
                sold = min(qty, entry[0])
                entry[0] -= sold
                entry[1] -= sold * avg
                realized_total += sold * (Decimal(str(tx.price)) - avg)
                if entry[0] <= 0:
                    entry[0], entry[1] = Decimal('0'), Decimal('0')
        day = timezone.localdate(tx.transaction_date).isoformat()
        daily_basis[day] = sum(spent for _, spent in per_stock.values())
        daily_realized[day] = realized_total

    return daily_basis, daily_realized


def calculate_stock_allocation(user):
    """
    Calculates portfolio allocation by sector.
    """
    holdings = StockSummary.objects.filter(user=user, current_holding__gt=0).select_related('stock')
    
    if not holdings.exists():
        return []
        
    symbols = [h.stock.symbol for h in holdings]
    
    # Read strictly from the cache store
    prices = {}
    for symbol in symbols:
        price = price_store.get(symbol)
        if price:
            prices[symbol] = price
                
    sector_values = {}
    total_value = Decimal('0.00')
    
    for holding in holdings:
        sym = holding.stock.symbol
        sector = holding.stock.sector or 'Other'
        current_price = prices.get(sym, float(holding.avg_price))
        value = holding.current_holding * Decimal(str(current_price))
        
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

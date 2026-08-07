from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from .models import Stock, StockSummary, UserTransaction, PortfolioValuationDaily
from utils.yahoo_finance import get_quotes
from utils.price_store import currency_store


def _snapshot_portfolio_valuation(user):
    """Persist today's portfolio value so the performance chart can show buy/sell jumps."""
    try:
        from dashboard.services import get_current_portfolio_valuation
        val = get_current_portfolio_valuation(user)
        today = timezone.now().date()
        daily, _ = PortfolioValuationDaily.objects.get_or_create(
            user=user,
            date=today,
            defaults={'portfolio_valuation': val},
        )
        daily.portfolio_valuation = val
        daily.save(update_fields=['portfolio_valuation'])
    except Exception:
        # Chart history is best-effort; don't fail the trade if snapshot fails
        pass


def add_buy_transaction(user, symbol, quantity, price):
    """
    Process a BUY transaction:
    - Adds/updates Stock
    - Adds UserTransaction
    - Updates/creates StockSummary
    """
    quantity = Decimal(str(quantity))
    price = Decimal(str(price))
    
    with transaction.atomic():
        # Get or create stock
        stock, created = Stock.objects.get_or_create(symbol=symbol)
        
        if created:
            quotes = get_quotes([symbol])
            if quotes:
                q = quotes[0]
                stock.short_name = q.get('name')
                stock.long_name = q.get('longName')
                stock.exchange = q.get('exchange')
                stock.currency = q.get('currency')
                stock.save()
                
        # Record transaction
        UserTransaction.objects.create(
            user=user,
            stock=stock,
            quantity=quantity,
            price=price,
            transaction_type='BUY'
        )
        
        # Update summary
        summary, sum_created = StockSummary.objects.get_or_create(
            user=user, 
            stock=stock
        )
        
        cost = quantity * price
        
        if sum_created or summary.current_holding == 0:
            summary.current_holding = quantity
            summary.spent_amount = cost
            summary.avg_price = price
        else:
            new_holding = summary.current_holding + quantity
            new_spent = summary.spent_amount + cost
            summary.current_holding = new_holding
            summary.spent_amount = new_spent
            summary.avg_price = new_spent / new_holding
            
        summary.save()

    _snapshot_portfolio_valuation(user)
    return True, "Buy transaction successful"


def add_sell_transaction(user, symbol, quantity, price):
    """
    Process a SELL transaction:
    - Validates holdings
    - Adds UserTransaction
    - Updates StockSummary and calculates realized gains
    """
    quantity = Decimal(str(quantity))
    price = Decimal(str(price))
    
    with transaction.atomic():
        try:
            stock = Stock.objects.get(symbol=symbol)
            summary = StockSummary.objects.get(user=user, stock=stock)
        except (Stock.DoesNotExist, StockSummary.DoesNotExist):
            return False, "You do not own this stock."
            
        if summary.current_holding < quantity:
            return False, f"Insufficient holdings. You only have {summary.current_holding} shares."
            
        # Record transaction
        UserTransaction.objects.create(
            user=user,
            stock=stock,
            quantity=quantity,
            price=price,
            transaction_type='SELL'
        )
        
        # Calculate gains
        sell_value = quantity * price
        avg_cost_for_sold_shares = quantity * summary.avg_price
        gain = sell_value - avg_cost_for_sold_shares
        
        # Update summary
        summary.current_holding -= quantity
        summary.spent_amount -= avg_cost_for_sold_shares
        summary.realized_gain += gain
        
        # If sold completely
        if summary.current_holding == 0:
            summary.spent_amount = Decimal('0')
            summary.avg_price = Decimal('0')
            
        summary.save()

    _snapshot_portfolio_valuation(user)
    return True, "Sell transaction successful"

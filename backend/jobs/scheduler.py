import atexit
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from django.utils import timezone
from decimal import Decimal

def update_all_portfolio_valuations():
    """Run every 12 hours. Updates valuation for all active users."""
    print(f"[{timezone.now()}] Running update_all_portfolio_valuations...")
    from users.models import User
    from dashboard.services import get_current_portfolio_valuation
    from portfolio.models import PortfolioValuationDaily, PortfolioValuationHourly
    
    users = User.objects.all()
    now = timezone.now()
    
    for user in users:
        try:
            val = get_current_portfolio_valuation(user)
            if val > 0:
                # Save daily (updates if exists for today)
                daily, _ = PortfolioValuationDaily.objects.get_or_create(
                    user=user, date=now.date(),
                    defaults={'portfolio_valuation': val}
                )
                daily.portfolio_valuation = val
                daily.save()
                
                # Save hourly
                PortfolioValuationHourly.objects.create(
                    user=user, timestamp=now, portfolio_valuation=val
                )
        except Exception as e:
            print(f"Error updating valuation for {user.email}: {e}")
            
    print("Finished update_all_portfolio_valuations.")


def update_yesterday_holdings():
    """Run daily at midnight. Sets yesterday_holding to current_holding."""
    print(f"[{timezone.now()}] Running update_yesterday_holdings...")
    from portfolio.models import StockSummary
    from django.db.models import F
    
    StockSummary.objects.update(yesterday_holding=F('current_holding'))
    print("Finished update_yesterday_holdings.")


def update_global_market_data():
    """Run every 2 minutes to cache global market data."""
    print(f"[{timezone.now()}] Running update_global_market_data...")
    from dashboard.models import GlobalMarketData
    from utils.yahoo_finance import get_quotes
    import yfinance as yf
    
    symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'SBIN.NS']
    quotes = get_quotes(symbols)
    
    # Gainers
    gainers = sorted([q for q in quotes if q['changePercent'] != 'N/A'], key=lambda x: float(x['changePercent']), reverse=True)
    GlobalMarketData.objects.update_or_create(data_type='GAINERS', defaults={'payload': gainers[:10]})
    
    # Losers
    losers = sorted([q for q in quotes if q['changePercent'] != 'N/A'], key=lambda x: float(x['changePercent']))
    GlobalMarketData.objects.update_or_create(data_type='LOSERS', defaults={'payload': losers[:10]})
    
    # Active
    active = sorted([q for q in quotes if q['volume'] != 'N/A'], key=lambda x: int(str(x['volume']).replace(',', '')), reverse=True)
    GlobalMarketData.objects.update_or_create(data_type='ACTIVE', defaults={'payload': active[:10]})
    
    # News
    try:
        ticker = yf.Ticker('^NSEI')
        news = ticker.news[:5] if hasattr(ticker, 'news') else []
        if news:
            GlobalMarketData.objects.update_or_create(data_type='NEWS', defaults={'payload': news})
    except:
        pass
        
    print("Finished update_global_market_data.")


def update_user_cache_metrics():
    """Run every 30 minutes to pre-calculate and cache portfolio metrics for users."""
    print(f"[{timezone.now()}] Running update_user_cache_metrics...")
    from users.models import User
    from portfolio.models import StockSummary, UserTransaction
    from decimal import Decimal
    from utils.yahoo_finance import get_quotes
    from utils.price_store import price_store, currency_store
    from django.core.cache import cache
    
    users = User.objects.all()
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for user in users:
        try:
            holdings = StockSummary.objects.filter(user=user, current_holding__gt=0).select_related('stock')
            if not holdings.exists():
                continue
                
            symbols = [h.stock.symbol for h in holdings]
            quotes = get_quotes(symbols)
            quote_map = {q['symbol']: q for q in quotes if 'symbol' in q}
            
            today_tx_stocks = set(UserTransaction.objects.filter(
                user=user, 
                transaction_date__gte=today_start
            ).values_list('stock_id', flat=True))
            
            total_investment = Decimal('0.00')
            current_value = Decimal('0.00')
            today_return = Decimal('0.00')
            
            for holding in holdings:
                sym = holding.stock.symbol
                currency = holding.stock.currency or 'USD'
                exchange_rate = currency_store.get_rate(currency)
                
                q = quote_map.get(sym, {})
                current_price_str = q.get('price', 'N/A')
                prev_close_str = q.get('previousClose', 'N/A')
                
                try:
                    current_price = float(current_price_str)
                    price_store.set(sym, current_price)
                except:
                    current_price = float(holding.avg_price)
                    
                try:
                    prev_close = float(prev_close_str)
                except:
                    prev_close = current_price
                    
                inr_price = current_price * exchange_rate
                inr_prev = prev_close * exchange_rate
                
                val = holding.current_holding * Decimal(str(inr_price))
                prev_val = holding.current_holding * Decimal(str(inr_prev))
                
                spent = holding.spent_amount if hasattr(holding, 'spent_amount') else holding.current_holding * Decimal(str(holding.avg_price))
                
                if holding.stock_id in today_tx_stocks:
                    prev_val = spent * Decimal(str(exchange_rate))
                    
                total_investment += spent * Decimal(str(exchange_rate))
                current_value += val
                today_return += (val - prev_val)
                
            total_return = current_value - total_investment
            total_return_pct = (total_return / total_investment) * 100 if total_investment > 0 else 0
            today_return_pct = (today_return / (current_value - today_return)) * 100 if (current_value - today_return) > 0 else 0
            
            data = {
                'totalValuation': float(current_value.quantize(Decimal('0.01'))),
                'totalInvestment': float(total_investment.quantize(Decimal('0.01'))),
                'todayProfitLoss': float(today_return.quantize(Decimal('0.01'))),
                'todayProfitLosspercentage': float(Decimal(str(today_return_pct)).quantize(Decimal('0.01'))),
                'overallProfitLoss': float(total_return.quantize(Decimal('0.01'))),
                'overallProfitLosspercentage': float(Decimal(str(total_return_pct)).quantize(Decimal('0.01')))
            }
            
            cache_key = f"user_valuation_{user.id}"
            cache.set(cache_key, data, timeout=60*60)
        except Exception as e:
            print(f"Error updating cache metrics for {user.email}: {e}")
            
    print("Finished update_user_cache_metrics.")


def start_scheduler():
    scheduler = BackgroundScheduler()
    
    # 1. Update valuations every 12 hours
    scheduler.add_job(
        update_all_portfolio_valuations,
        trigger=IntervalTrigger(hours=12),
        id="update_valuations_12h",
        name="Update portfolio valuations every 12h",
        replace_existing=True
    )
    
    # 2. Update yesterday holdings daily at midnight IST
    scheduler.add_job(
        update_yesterday_holdings,
        trigger=CronTrigger(hour=0, minute=0, timezone='Asia/Kolkata'),
        id="update_yesterday_holdings",
        name="Update yesterday holdings at midnight",
        replace_existing=True
    )
    
    # 3. Update global market data every 2 minutes
    scheduler.add_job(
        update_global_market_data,
        trigger=IntervalTrigger(minutes=2),
        id="update_global_market_data",
        name="Update global market data every 2 mins",
        replace_existing=True
    )
    
    # 4. Update user cache metrics every 30 minutes
    scheduler.add_job(
        update_user_cache_metrics,
        trigger=IntervalTrigger(minutes=30),
        id="update_user_cache_metrics",
        name="Update user cache metrics every 30 mins",
        replace_existing=True
    )
    
    scheduler.start()
    
    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown(wait=False))

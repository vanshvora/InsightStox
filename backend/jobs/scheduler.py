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
    
    scheduler.start()
    
    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown(wait=False))

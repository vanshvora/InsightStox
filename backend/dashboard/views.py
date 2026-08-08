import math
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta, date

from .services import get_current_portfolio_valuation, calculate_stock_allocation
from portfolio.models import Stock, StockSummary, UserWatchlist, PortfolioValuationDaily, PortfolioValuationHourly
from utils.yahoo_finance import search_stock, get_quotes
import yfinance as yf
from users.views import _add_activity_history, _get_user_agent_info


def _safe_float(value, default=None):
    """Convert to float, treating NaN/Inf/invalid as default."""
    try:
        if value is None:
            return default
        num = float(value)
        if math.isnan(num) or math.isinf(num):
            return default
        return num
    except (TypeError, ValueError):
        return default


def _sanitize_for_json(obj):
    """Recursively replace NaN/Inf with None so DRF JSON rendering never crashes."""
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(v) for v in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    # numpy / pandas scalars
    try:
        import numpy as np
        if isinstance(obj, np.generic):
            return _sanitize_for_json(obj.item())
    except Exception:
        pass
    return obj


def _last_valid_close(symbol, period='5d'):
    """Fallback price from recent history when ticker.info is incomplete."""
    try:
        df = yf.Ticker(symbol).history(period=period, auto_adjust=True)
        if df is None or df.empty:
            return None
        closes = df['Close'].dropna()
        if closes.empty:
            return None
        return _safe_float(closes.iloc[-1])
    except Exception:
        return None


class SearchStockView(APIView):
    def get(self, request):
        query = request.query_params.get('query', '')
        if not query:
            return Response({'success': False, 'message': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        cache_key = f"search_stock_{query.lower()}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
            
        result = search_stock(query)
        if not result or not result.get('quotes'):
            return Response({'success': False, 'message': 'No stocks found'}, status=status.HTTP_404_NOT_FOUND)
            
        response_data = {
            'success': True,
            'data': result['quotes'],
            'news': result.get('news', [])
        }
        
        cache.set(cache_key, response_data, timeout=60 * 60 * 24) # cache for 24 hours
        return Response(response_data)


class StarterView(APIView):
    def get(self, request):
        # Default market indices
        symbols = ["^NSEBANK", "^NSEI", "^BSESN"]
        quotes = get_quotes(symbols)
        
        name_map = {
            "^NSEBANK": "NIFTY BANK",
            "^NSEI": "NIFTY 50",
            "^BSESN": "SENSEX"
        }
        
        for q in quotes:
            if q.get('symbol') in name_map:
                q['name'] = name_map[q['symbol']]
                
        return Response({'success': True, 'data': quotes})


class ValuationView(APIView):
    def get(self, request):
        from portfolio.models import StockSummary
        from decimal import Decimal
        from utils.yahoo_finance import get_quotes
        from utils.price_store import price_store, currency_store
        from django.core.cache import cache
        
        cache_key = f"user_valuation_{request.user.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response({'success': True, 'data': cached_data})
            
        holdings = StockSummary.objects.filter(user=request.user, current_holding__gt=0).select_related('stock')
        
        if not holdings.exists():
            data = {
                'totalValuation': 0,
                'totalInvestment': 0,
                'todayProfitLoss': 0,
                'todayProfitLosspercentage': 0,
                'overallProfitLoss': 0,
                'overallProfitLosspercentage': 0
            }
            cache.set(cache_key, data, timeout=60*60) # cache for 1 hour
            return Response({'success': True, 'data': data})
            
        symbols = [h.stock.symbol for h in holdings]
        quotes = get_quotes(symbols)
        quote_map = {q['symbol']: q for q in quotes if 'symbol' in q}
        
        from portfolio.models import UserTransaction
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_tx_stocks = set(UserTransaction.objects.filter(
            user=request.user, 
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
            
            # Use spent_amount for precise investment calculation if available, or avg_price
            spent = holding.spent_amount if hasattr(holding, 'spent_amount') else holding.current_holding * Decimal(str(holding.avg_price))
            
            # If the user bought this stock today, their personal "Today's Return" should be based on their purchase price
            # rather than the previous day's close.
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
        
        cache.set(cache_key, data, timeout=60*60) # cache for 1 hour
        return Response({'success': True, 'data': data})


class WatchlistView(APIView):
    def get(self, request):
        watchlist = UserWatchlist.objects.filter(user=request.user).select_related('stock')
        if not watchlist.exists():
            return Response({'success': True, 'data': []})
            
        symbols = [item.stock.symbol for item in watchlist]
        quotes = get_quotes(symbols)
        
        stock_map = {item.stock.symbol: item.stock.short_name or item.stock.symbol for item in watchlist}
        for q in quotes:
            if q.get('symbol') in stock_map:
                q['name'] = stock_map[q['symbol']]
                
        return Response({'success': True, 'data': quotes})


class AddToWatchlistView(APIView):
    def post(self, request):
        symbol = request.data.get('symbol', '').upper()
        if not symbol:
            return Response({'success': False, 'message': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Ensure stock exists in DB
        stock, created = Stock.objects.get_or_create(symbol=symbol)
        
        if not created:
            # Check if already in watchlist
            if UserWatchlist.objects.filter(user=request.user, stock=stock).exists():
                return Response({'success': False, 'message': 'Stock is already in watchlist'}, status=status.HTTP_400_BAD_REQUEST)
                
        # Get extra info if new
        if created:
            quotes = get_quotes([symbol])
            if quotes:
                q = quotes[0]
                stock.short_name = q.get('name')
                stock.long_name = q.get('longName')
                stock.exchange = q.get('exchange')
                stock.currency = q.get('currency')
                stock.save()
                
        UserWatchlist.objects.create(user=request.user, stock=stock)
        
        browser, os_type = _get_user_agent_info(request)
        token = request.auth.token if request.auth and hasattr(request.auth, 'token') else request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
        if not token:
            token = request.COOKIES.get('auth_token', '')
        _add_activity_history(request.user, 'Watchlist', f"Added {symbol} to watchlist", token, browser, os_type)
        
        return Response({'success': True, 'message': 'Stock added to watchlist'})


class RemoveFromWatchlistView(APIView):
    def delete(self, request):
        symbol = request.data.get('symbol') or request.query_params.get('symbol', '')
        symbol = symbol.upper() if symbol else ''
        if not symbol:
            return Response({'success': False, 'message': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            stock = Stock.objects.get(symbol=symbol)
            UserWatchlist.objects.filter(user=request.user, stock=stock).delete()
            
            browser, os_type = _get_user_agent_info(request)
            token = request.auth.token if request.auth and hasattr(request.auth, 'token') else request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
            if not token:
                token = request.COOKIES.get('auth_token', '')
            _add_activity_history(request.user, 'Watchlist', f"Removed {symbol} from watchlist", token, browser, os_type)
            
            return Response({'success': True, 'message': 'Stock removed from watchlist'})
        except Stock.DoesNotExist:
            return Response({'success': False, 'message': 'Stock not found in watchlist'}, status=status.HTTP_404_NOT_FOUND)


class StockAllocationView(APIView):
    def get(self, request):
        allocation = calculate_stock_allocation(request.user)
        labels = [item['sector'] for item in allocation]
        values = [item['percentage'] for item in allocation]
        return Response({
            'success': True, 
            'labels': labels,
            'values': values
        })


from .models import GlobalMarketData

class MarketGainersView(APIView):
    def get(self, request):
        obj = GlobalMarketData.objects.filter(data_type='GAINERS').first()
        data = obj.payload if obj else []
        return Response({'success': True, 'data': data})


class MarketLosersView(APIView):
    def get(self, request):
        obj = GlobalMarketData.objects.filter(data_type='LOSERS').first()
        data = obj.payload if obj else []
        return Response({'success': True, 'data': data})


class MarketActiveView(APIView):
    def get(self, request):
        active_obj = GlobalMarketData.objects.filter(data_type='ACTIVE').first()
        news_obj = GlobalMarketData.objects.filter(data_type='NEWS').first()
        
        active_data = active_obj.payload if active_obj else []
        news_data = news_obj.payload if news_obj else []
            
        return Response({'success': True, 'data': active_data, 'news': news_data})


class StockSummaryView(APIView):
    def get(self, request):
        summaries = StockSummary.objects.filter(user=request.user).select_related('stock')
        
        data = []
        for s in summaries:
            data.append({
                'symbol': s.stock.symbol,
                'name': s.stock.short_name,
                'current_holding': float(s.current_holding),
                'spent_amount': float(s.spent_amount),
                'avg_price': float(s.avg_price),
                'realized_gain': float(s.realized_gain),
            })
            
        return Response({'success': True, 'data': data})


class PortfolioValuationHistoryView(APIView):
    def get(self, request):
        time_period = request.query_params.get('timePeriod', '1Y')
        
        now = timezone.now()
        
        if time_period == '1D':
            # Hourly data for last 24h
            start = now - timedelta(days=1)
            history = PortfolioValuationHourly.objects.filter(user=request.user, timestamp__gte=start).order_by('timestamp')
            data = [{'date': h.timestamp.isoformat(), 'valuation': float(h.portfolio_valuation)} for h in history]
            
        else:
            # Daily data — return full span so the frontend can slice 30D / 6M / 1Y
            if time_period == '1W':
                start = now.date() - timedelta(days=7)
            elif time_period == '1M':
                start = now.date() - timedelta(days=30)
            elif time_period == '6M':
                start = now.date() - timedelta(days=182)
            elif time_period == '1Y':
                start = now.date() - timedelta(days=365)
            elif time_period == '5Y':
                start = now.date() - timedelta(days=365*5)
            else:
                start = now.date() - timedelta(days=365)
                
            history = PortfolioValuationDaily.objects.filter(user=request.user, date__gte=start).order_by('date')
            
            # Dedupe by date; keep latest write per day
            by_date = {}
            for h in history:
                by_date[h.date.isoformat()] = float(h.portfolio_valuation)

            from dashboard.services import get_current_portfolio_valuation
            current_val = float(get_current_portfolio_valuation(request.user))
            today_key = now.date().isoformat()
            by_date[today_key] = current_val

            data = [{'date': d, 'valuation': v} for d, v in sorted(by_date.items())]

            # Baseline at 0 the day before the first real point so new buys show as a jump
            if data:
                first_date = date.fromisoformat(data[0]['date'])
                if data[0]['valuation'] > 0:
                    baseline = (first_date - timedelta(days=1)).isoformat()
                    if baseline not in by_date:
                        data.insert(0, {'date': baseline, 'valuation': 0.0})
            else:
                yesterday = (now.date() - timedelta(days=1)).isoformat()
                data = [
                    {'date': yesterday, 'valuation': 0.0},
                    {'date': today_key, 'valuation': current_val},
                ]
            
        return Response({'success': True, 'data': {'daily': data}})


class StockDetailsView(APIView):
    def get(self, request):
        symbol = request.query_params.get('symbol') or request.query_params.get('ticker')
        if not symbol:
            return Response({'success': False, 'message': 'Symbol or ticker is required'}, status=status.HTTP_400_BAD_REQUEST)
        symbol = symbol.upper()
            
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            in_watchlist = UserWatchlist.objects.filter(user=request.user, stock__symbol=symbol).exists()
            holding = 0
            summary = StockSummary.objects.filter(user=request.user, stock__symbol=symbol).first()
            if summary:
                holding = float(summary.current_holding)
                
            price = _safe_float(info.get('currentPrice', info.get('regularMarketPrice')))
            prev_close = _safe_float(info.get('previousClose', info.get('regularMarketPreviousClose')))
            change = _safe_float(info.get('regularMarketChange'))
            change_pct = _safe_float(info.get('regularMarketChangePercent'))

            if price is None:
                price = _last_valid_close(symbol)

            if change is None and price is not None and prev_close:
                change = price - prev_close
                change_pct = (change / prev_close) * 100 if prev_close else 0

            roe = _safe_float(info.get('returnOnEquity'), 0) or 0
            data = {
                'in_watchlist': in_watchlist,
                'current_holding': holding,
                'priceInfo': {
                    'currentPrice': price,
                    'previousClose': prev_close,
                    'open': _safe_float(info.get('open')),
                    'dayHigh': _safe_float(info.get('dayHigh')),
                    'dayLow': _safe_float(info.get('dayLow')),
                    'volume': _safe_float(info.get('volume')),
                    'fiftytwoWeekHigh': _safe_float(info.get('fiftyTwoWeekHigh')),
                    'fiftyTwoWeekLow': _safe_float(info.get('fiftyTwoWeekLow')),
                    'marketCap': _safe_float(info.get('marketCap')),
                    'change': change if change is not None else 0,
                    'changePercentage': change_pct if change_pct is not None else 0,
                },
                'fundamentals': {
                    'roceTTM': roe * 1.2,
                    'peRatioTTM': _safe_float(info.get('trailingPE')),
                    'pbRatio': _safe_float(info.get('priceToBook')),
                    'industryPE': _safe_float(info.get('trailingPE')),
                    'debtToEquity': _safe_float(info.get('debtToEquity')),
                    'roeTTM': roe,
                    'epsTTM': _safe_float(info.get('trailingEps')),
                    'dividendYield': _safe_float(info.get('dividendYield')),
                    'bookValue': _safe_float(info.get('bookValue')),
                    'faceValue': _safe_float(info.get('bookValue')),
                },
                'financials': {
                    'revenueTTM': _safe_float(info.get('totalRevenue')),
                    'revenuePerShare': _safe_float(info.get('revenuePerShare')),
                    'earningGrowthQuater': _safe_float(info.get('earningsQuarterlyGrowth')),
                    'grossProfitTTM': _safe_float(info.get('grossProfits')),
                    'ebitda': _safe_float(info.get('ebitda')),
                    'netIncome': _safe_float(info.get('netIncomeToCommon')),
                    'dilutedEPS': _safe_float(info.get('trailingEps')),
                },
                'balenceSheet': {
                    'totalCash': _safe_float(info.get('totalCash')),
                    'totalCashPerShare': _safe_float(info.get('totalCashPerShare')),
                    'totalDebt': _safe_float(info.get('totalDebt')),
                    'deptToEquity': _safe_float(info.get('debtToEquity')),
                    'currentRatioMRQ': _safe_float(info.get('currentRatio')),
                    'bookValuePerShare': _safe_float(info.get('bookValue')),
                },
                'profitability': {
                    'profitMargin': _safe_float(info.get('profitMargins')),
                    'operatingMargin': _safe_float(info.get('operatingMargins')),
                    'returnOnAssets': _safe_float(info.get('returnOnAssets')),
                    'returnOnEquity': roe,
                },
                'cashFlow': {
                    'operatingCashFlow': _safe_float(info.get('operatingCashflow')),
                    'freeCashFlow': _safe_float(info.get('freeCashflow')),
                },
                'fiscalInformation': {
                    'fiscalYearEnd': info.get('nextFiscalYearEnd'),
                    'MRQ': info.get('mostRecentQuarter'),
                },
                'Company': {
                    'longname': info.get('longName'),
                    'shortname': info.get('shortName'),
                    'fulltimeemployees': info.get('fullTimeEmployees'),
                    'sector': info.get('sector'),
                    'industry': info.get('industry'),
                    'longdescription': info.get('longBusinessSummary'),
                    'website': info.get('website'),
                }
            }
            return Response({'success': True, 'data': _sanitize_for_json(data)})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GraphDataView(APIView):
    """Historical chart coordinates for a ticker."""
    def get(self, request):
        symbol = request.query_params.get('symbol') or request.query_params.get('ticker')
        # Frontend slices 1M/3M/6M/1Y client-side, so always fetch a full year
        period = request.query_params.get('period', '1y')
        
        if not symbol:
            return Response({'success': False, 'message': 'Symbol or ticker is required'}, status=status.HTTP_400_BAD_REQUEST)
        symbol = symbol.upper()
            
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, auto_adjust=True)
            if df is None or df.empty:
                return Response({'success': False, 'message': 'No chart data available'}, status=status.HTTP_404_NOT_FOUND)

            closes = df['Close']
            x = []
            y = []
            for index, value in closes.items():
                close = _safe_float(value)
                if close is None:
                    continue
                # Normalize timestamps to plain strings / plain floats (no numpy/pandas types)
                if hasattr(index, 'strftime'):
                    x.append(index.strftime('%Y-%m-%d'))
                else:
                    x.append(str(index)[:10])
                y.append(float(close))

            if not x:
                return Response({'success': False, 'message': 'No valid chart points'}, status=status.HTTP_404_NOT_FOUND)
                
            return Response(_sanitize_for_json({'success': True, 'x': x, 'y': y}))
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NewsView(APIView):
    """Stock specific news."""
    def get(self, request, query):
        if not query:
            return Response({'success': False, 'message': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ticker = yf.Ticker(query)
            news = ticker.news[:10] if hasattr(ticker, 'news') else []
            return Response({'success': True, 'data': news})
        except:
            return Response({'success': False, 'message': 'Failed to fetch news'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

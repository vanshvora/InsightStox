from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta

from .services import get_current_portfolio_valuation, calculate_stock_allocation
from portfolio.models import Stock, StockSummary, UserWatchlist, PortfolioValuationDaily, PortfolioValuationHourly
from utils.yahoo_finance import search_stock, get_quotes
import yfinance as yf


class SearchStockView(APIView):
    def get(self, request):
        query = request.query_params.get('query', '')
        if not query:
            return Response({'success': False, 'message': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        result = search_stock(query)
        if not result or not result.get('quotes'):
            return Response({'success': False, 'message': 'No stocks found'}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            'success': True,
            'data': result['quotes'],
            'news': result.get('news', [])
        })


class StarterView(APIView):
    def get(self, request):
        # Default market indices
        symbols = ["^NSEBANK", "^NSEI", "^BSESN"]
        quotes = get_quotes(symbols)
        return Response({'success': True, 'data': quotes})


class ValuationView(APIView):
    def get(self, request):
        valuation = get_current_portfolio_valuation(request.user)
        return Response({
            'success': True,
            'data': float(valuation)
        })


class WatchlistView(APIView):
    def get(self, request):
        watchlist = UserWatchlist.objects.filter(user=request.user).select_related('stock')
        symbols = [item.stock.symbol for item in watchlist]
        
        if not symbols:
            return Response({'success': True, 'data': []})
            
        quotes = get_quotes(symbols)
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
        return Response({'success': True, 'message': 'Stock added to watchlist'})


class RemoveFromWatchlistView(APIView):
    def delete(self, request):
        symbol = request.data.get('symbol', '').upper()
        if not symbol:
            return Response({'success': False, 'message': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            stock = Stock.objects.get(symbol=symbol)
            UserWatchlist.objects.filter(user=request.user, stock=stock).delete()
            return Response({'success': True, 'message': 'Stock removed from watchlist'})
        except Stock.DoesNotExist:
            return Response({'success': False, 'message': 'Stock not found in watchlist'}, status=status.HTTP_404_NOT_FOUND)


class StockAllocationView(APIView):
    def get(self, request):
        allocation = calculate_stock_allocation(request.user)
        return Response({'success': True, 'data': allocation})


class MarketGainersView(APIView):
    def get(self, request):
        # yfinance doesn't easily expose day gainers natively without scraping
        # We'll use a predefined list of popular Indian stocks for demonstration
        symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS']
        quotes = get_quotes(symbols)
        # Sort by change percent descending
        gainers = sorted([q for q in quotes if q['changePercent'] != 'N/A'], key=lambda x: float(x['changePercent']), reverse=True)
        return Response({'success': True, 'data': gainers[:10]})


class MarketLosersView(APIView):
    def get(self, request):
        symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS']
        quotes = get_quotes(symbols)
        # Sort by change percent ascending
        losers = sorted([q for q in quotes if q['changePercent'] != 'N/A'], key=lambda x: float(x['changePercent']))
        return Response({'success': True, 'data': losers[:10]})


class MarketActiveView(APIView):
    def get(self, request):
        symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS']
        quotes = get_quotes(symbols)
        # Sort by volume descending
        active = sorted([q for q in quotes if q['volume'] != 'N/A'], key=lambda x: int(x['volume'].replace(',', '')), reverse=True)
        return Response({'success': True, 'data': active[:10]})


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
        time_period = request.query_params.get('timePeriod', '1M')
        
        now = timezone.now()
        
        if time_period == '1D':
            # Hourly data for last 24h
            start = now - timedelta(days=1)
            history = PortfolioValuationHourly.objects.filter(user=request.user, timestamp__gte=start).order_by('timestamp')
            data = [{'date': h.timestamp.isoformat(), 'valuation': float(h.portfolio_valuation)} for h in history]
            
        else:
            # Daily data
            if time_period == '1W':
                start = now.date() - timedelta(days=7)
            elif time_period == '1M':
                start = now.date() - timedelta(days=30)
            elif time_period == '1Y':
                start = now.date() - timedelta(days=365)
            elif time_period == '5Y':
                start = now.date() - timedelta(days=365*5)
            else:
                start = now.date() - timedelta(days=30) # Default 1M
                
            history = PortfolioValuationDaily.objects.filter(user=request.user, date__gte=start).order_by('date')
            data = [{'date': h.date.isoformat(), 'valuation': float(h.portfolio_valuation)} for h in history]
            
        return Response({'success': True, 'data': data})


class StockDetailsView(APIView):
    def get(self, request):
        symbol = request.query_params.get('symbol', '').upper()
        if not symbol:
            return Response({'success': False, 'message': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        quotes = get_quotes([symbol])
        if not quotes:
            return Response({'success': False, 'message': 'Stock details not found'}, status=status.HTTP_404_NOT_FOUND)
            
        data = quotes[0]
        
        # Check if user has this in watchlist or holding
        in_watchlist = UserWatchlist.objects.filter(user=request.user, stock__symbol=symbol).exists()
        
        holding = 0
        summary = StockSummary.objects.filter(user=request.user, stock__symbol=symbol).first()
        if summary:
            holding = float(summary.current_holding)
            
        data['in_watchlist'] = in_watchlist
        data['current_holding'] = holding
        
        return Response({'success': True, 'data': data})


class GraphDataView(APIView):
    """Placeholder for complex graph data returning historical chart coordinates."""
    def get(self, request):
        symbol = request.query_params.get('symbol', '')
        period = request.query_params.get('period', '1mo')
        
        if not symbol:
            return Response({'success': False, 'message': 'Symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Simplified: uses yf history
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
            
            data = []
            for index, row in df.iterrows():
                data.append({
                    'x': index.strftime('%Y-%m-%d'),
                    'y': float(row['Close'])
                })
                
            return Response({'success': True, 'data': data})
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

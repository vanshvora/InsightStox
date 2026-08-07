from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from decimal import Decimal

from .models import StockSummary
from .services import add_buy_transaction, add_sell_transaction
from utils.yahoo_finance import get_quotes
from utils.price_store import price_store, currency_store

# Note: The actual AddTransaction endpoint was placed in dashboard in JS,
# but we'll put it here logically, and link it in dashboard urls too for compatibility.

class AddTransactionView(APIView):
    def post(self, request):
        symbol = request.data.get('symbol', '').upper()
        quantity = request.data.get('quantity')
        price = request.data.get('price')
        t_type = request.data.get('type', '').upper()
        
        if not symbol or not quantity or not price or not t_type:
            return Response({'success': False, 'message': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            float(quantity)
            float(price)
        except ValueError:
            return Response({'success': False, 'message': 'Quantity and price must be numbers'}, status=status.HTTP_400_BAD_REQUEST)
            
        if t_type == 'BUY':
            success, msg = add_buy_transaction(request.user, symbol, quantity, price)
        elif t_type == 'SELL':
            success, msg = add_sell_transaction(request.user, symbol, quantity, price)
        else:
            return Response({'success': False, 'message': 'Invalid transaction type'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not success:
            return Response({'success': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({'success': True, 'message': msg})


class PortfolioSummaryView(APIView):
    def get(self, request):
        holdings = StockSummary.objects.filter(user=request.user, current_holding__gt=0).select_related('stock')
        
        if not holdings.exists():
            return Response({'success': True, 'data': {
                'totalInvestment': 0,
                'currentValue': 0,
                'totalReturn': 0,
                'totalReturnPercent': 0,
                'todayReturn': 0,
                'todayReturnPercent': 0
            }})
            
        symbols = [h.stock.symbol for h in holdings]
        quotes = get_quotes(symbols)
        
        # Create quote map
        quote_map = {q['symbol']: q for q in quotes if 'symbol' in q}
        
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
            
            total_investment += holding.spent_amount * Decimal(str(exchange_rate))
            current_value += val
            today_return += (val - prev_val)
            
        total_return = current_value - total_investment
        total_return_pct = (total_return / total_investment) * 100 if total_investment > 0 else 0
        today_return_pct = (today_return / (current_value - today_return)) * 100 if (current_value - today_return) > 0 else 0
        
        data = {
            'totalInvestment': float(total_investment.quantize(Decimal('0.01'))),
            'currentValue': float(current_value.quantize(Decimal('0.01'))),
            'totalReturn': float(total_return.quantize(Decimal('0.01'))),
            'totalReturnPercent': float(Decimal(str(total_return_pct)).quantize(Decimal('0.01'))),
            'todayReturn': float(today_return.quantize(Decimal('0.01'))),
            'todayReturnPercent': float(Decimal(str(today_return_pct)).quantize(Decimal('0.01')))
        }
        
        return Response({'success': True, 'data': data})


class PortfolioFundamentalsView(APIView):
    def get(self, request):
        holdings = StockSummary.objects.filter(user=request.user, current_holding__gt=0).select_related('stock')
        symbols = [h.stock.symbol for h in holdings]
        
        if not symbols:
            return Response({'success': True, 'data': []})
            
        quotes = get_quotes(symbols)
        return Response({'success': True, 'data': quotes})


class PortfolioHoldingsView(APIView):
    def get(self, request):
        holdings = StockSummary.objects.filter(user=request.user, current_holding__gt=0).select_related('stock')
        symbols = [h.stock.symbol for h in holdings]
        
        if not symbols:
            return Response({'success': True, 'data': []})
            
        quotes = get_quotes(symbols)
        quote_map = {q['symbol']: q for q in quotes if 'symbol' in q}
        
        results = []
        for holding in holdings:
            sym = holding.stock.symbol
            q = quote_map.get(sym, {})
            
            results.append({
                'symbol': sym,
                'name': holding.stock.short_name,
                'quantity': float(holding.current_holding),
                'avgPrice': float(holding.avg_price),
                'currentPrice': q.get('price', 'N/A'),
                'change': q.get('change', 'N/A'),
                'changePercent': q.get('changePercent', 'N/A'),
                'value': float(holding.current_holding * holding.avg_price) # Simplification
            })
            
        return Response({'success': True, 'data': results})

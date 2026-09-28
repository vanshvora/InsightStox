from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from decimal import Decimal

from .models import StockSummary
from .services import add_buy_transaction, add_sell_transaction
from utils.yahoo_finance import get_quotes
from utils.price_store import price_store
from users.views import _add_activity_history, _get_user_agent_info

# Note: The actual AddTransaction endpoint was placed in dashboard in JS,
# but we'll put it here logically, and link it in dashboard urls too for compatibility.

class AddTransactionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        symbol = request.data.get('symbol', '').upper()
        quantity = request.data.get('quantity')
        price = request.data.get('price')
        t_type = request.data.get('type', request.data.get('transaction_type', '')).upper()
        
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
            
        from django.core.cache import cache
        cache.delete(f"user_valuation_{request.user.id}")
            
        browser, os_type = _get_user_agent_info(request)
        token = request.auth.token if request.auth and hasattr(request.auth, 'token') else request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '')
        if not token:
            token = request.COOKIES.get('auth_token', '')
        action = f"Bought {quantity} shares of {symbol}" if t_type == 'BUY' else f"Sold {quantity} shares of {symbol}"
        _add_activity_history(request.user, 'Transaction', action, token, browser, os_type)
            
        return Response({'success': True, 'message': msg})


class PortfolioSummaryView(APIView):
    def get(self, request):
        holdings = StockSummary.objects.filter(user=request.user, current_holding__gt=0).select_related('stock')
        
        if not holdings.exists():
            return Response({'success': True, 'summary': []})
            
        symbols = [h.stock.symbol for h in holdings]
        quotes = get_quotes(symbols)
        
        quote_map = {q['symbol']: q for q in quotes if 'symbol' in q}
        
        total_portfolio_value = Decimal('0.00')
        summary = []
        
        for holding in holdings:
            sym = holding.stock.symbol
            q = quote_map.get(sym, {})
            
            try:
                current_price = float(q.get('price', holding.avg_price))
            except:
                current_price = float(holding.avg_price)
                
            currency = holding.stock.currency or 'INR'
            
            val = holding.current_holding * Decimal(str(current_price))
            total_portfolio_value += val
            
            spent = holding.spent_amount if hasattr(holding, 'spent_amount') else holding.current_holding * Decimal(str(holding.avg_price))
            total_spent_inr = spent
            
            pl = val - total_spent_inr
            pl_pct = (pl / total_spent_inr * 100) if total_spent_inr > 0 else 0
            
            summary.append({
                'symbol': sym,
                'marketCap': q.get('marketCap', 'N/A'),
                'lastPrice': current_price,
                'change': q.get('change', 0),
                'changePercent': q.get('changePercent', 0),
                'currency': currency,
                'marketTime': q.get('marketTime', 'N/A'),
                'volume': q.get('volume', 'N/A'),
                'shares': float(holding.current_holding),
                'dayRange': q.get('dayRange', 'N/A'),
                'yearRange': q.get('fiftyTwoWeekRange', 'N/A'),
                'totalValue': float(val.quantize(Decimal('0.01'))),
                'profitLoss': float(pl.quantize(Decimal('0.01'))),
                'profitLossPercentage': float(Decimal(str(pl_pct)).quantize(Decimal('0.01'))),
                'allocationPercentage': 0
            })
            
        for item in summary:
            if total_portfolio_value > 0:
                pct = (Decimal(str(item['totalValue'])) / total_portfolio_value) * 100
                item['allocationPercentage'] = float(pct.quantize(Decimal('0.01')))
                
        return Response({'success': True, 'summary': summary})


class PortfolioFundamentalsView(APIView):
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
            
            q['currentHolding'] = float(holding.current_holding)
            q['lastPrice'] = q.get('price', 'N/A')
            
            # Map extra fundamental fields that might not be in standard quotes
            from utils.price_store import fundamental_store
            import yfinance as yf
            
            funds = fundamental_store.get(sym)
            if not funds:
                try:
                    info = yf.Ticker(sym).info
                    funds = {
                        'epsEstimateNextYear': info.get('epsEstimateNextYear', 'N/A'),
                        'divPaymentDate': info.get('dividendDate', 'N/A'),
                        'exDivDate': info.get('exDividendDate', 'N/A'),
                        'dividendPerShare': info.get('dividendRate', 'N/A'),
                        'forwardAnnualDivRate': info.get('dividendRate', 'N/A'),
                        'forwardAnnualDivYield': info.get('dividendYield', 'N/A'),
                        'trailingAnnualDivRate': info.get('trailingAnnualDividendRate', 'N/A'),
                        'trailingAnnualDivYield': info.get('trailingAnnualDividendYield', 'N/A'),
                        'forwardPE': info.get('forwardPE', 'N/A'),
                        'priceToBook': info.get('priceToBook', 'N/A'),
                    }
                    fundamental_store.set(sym, funds)
                except Exception as e:
                    print(f"Lazy fetch failed for {sym}: {e}")
                    funds = {}
            
            if funds:
                q.update(funds)
            else:
                q['epsEstimateNextYear'] = 'N/A'
                q['divPaymentDate'] = 'N/A'
                q['exDivDate'] = 'N/A'
                q['dividendPerShare'] = 'N/A'
                q['forwardAnnualDivRate'] = 'N/A'
                q['forwardAnnualDivYield'] = 'N/A'
                q['trailingAnnualDivRate'] = 'N/A'
                q['trailingAnnualDivYield'] = 'N/A'
                q['forwardPE'] = 'N/A'
                q['priceToBook'] = 'N/A'
                
            results.append(q)
            
        return Response({'success': True, 'data': results})


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
            
            try:
                current_price = float(q.get('price', holding.avg_price))
            except:
                current_price = float(holding.avg_price)
                
            try:
                prev_close = float(q.get('previousClose', current_price))
            except:
                prev_close = current_price
                
            shares = float(holding.current_holding)
            avg_price = float(holding.avg_price)
            total_cost = shares * avg_price
            market_value = shares * current_price
            
            day_gain_val = (current_price - prev_close) * shares
            day_gain_pct = ((current_price - prev_close) / prev_close * 100) if prev_close > 0 else 0
            
            total_gain_val = market_value - total_cost
            total_gain_pct = (total_gain_val / total_cost * 100) if total_cost > 0 else 0
            
            results.append({
                'symbol': sym,
                'name': holding.stock.short_name,
                'status': 'Active',
                'shares': round(shares, 2),
                'lastPrice': round(current_price, 2),
                'avgPrice': round(avg_price, 2),
                'totalCost': round(total_cost, 2),
                'marketValue': round(market_value, 2),
                'dayGainValue': round(day_gain_val, 2),
                'dayGainPercent': round(day_gain_pct, 2),
                'totalGainValue': round(total_gain_val, 2),
                'totalGainPercent': round(total_gain_pct, 2),
                'realizedGain': float(holding.realized_gain)
            })
            
        return Response({'success': True, 'data': results})

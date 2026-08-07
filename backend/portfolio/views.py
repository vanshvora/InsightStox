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
                
            currency = holding.stock.currency or 'USD'
            exchange_rate = currency_store.get_rate(currency)
            inr_price = current_price * exchange_rate
            
            val = holding.current_holding * Decimal(str(inr_price))
            total_portfolio_value += val
            
            spent = holding.spent_amount if hasattr(holding, 'spent_amount') else holding.current_holding * Decimal(str(holding.avg_price))
            total_spent_inr = spent * Decimal(str(exchange_rate))
            
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
            # yfinance info dict mapping
            ticker = None
            try:
                import yfinance as yf
                ticker = yf.Ticker(sym)
                info = ticker.info
                q['epsEstimateNextYear'] = info.get('epsEstimateNextYear', 'N/A')
                q['divPaymentDate'] = info.get('dividendDate', 'N/A')
                q['exDivDate'] = info.get('exDividendDate', 'N/A')
                q['dividendPerShare'] = info.get('dividendRate', 'N/A')
                q['forwardAnnualDivRate'] = info.get('dividendRate', 'N/A')
                q['forwardAnnualDivYield'] = info.get('dividendYield', 'N/A')
                q['trailingAnnualDivRate'] = info.get('trailingAnnualDividendRate', 'N/A')
                q['trailingAnnualDivYield'] = info.get('trailingAnnualDividendYield', 'N/A')
            except:
                pass
                
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

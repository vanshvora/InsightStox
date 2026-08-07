from langchain_core.tools import tool
from portfolio.models import StockSummary
from dashboard.services import get_current_portfolio_valuation, calculate_stock_allocation
from utils.yahoo_finance import get_quotes

@tool
def portfolio_analysis_tool(user_email: str):
    """
    Analyzes the user's current portfolio and provides a summary.
    Requires the user's email to fetch their specific portfolio data.
    """
    try:
        from users.models import User
        user = User.objects.get(email=user_email)
        
        holdings = StockSummary.objects.filter(user=user, current_holding__gt=0).select_related('stock')
        
        if not holdings.exists():
            return "The user currently has no active stock holdings in their portfolio."
            
        # Get valuation
        valuation = get_current_portfolio_valuation(user)
        
        # Get allocations
        allocations = calculate_stock_allocation(user)
        
        # Fetch current quotes for holdings
        symbols = [h.stock.symbol for h in holdings]
        quotes = get_quotes(symbols)
        quote_map = {q['symbol']: q for q in quotes if 'symbol' in q}
        
        analysis = [f"Total Portfolio Valuation: {valuation} INR"]
        
        analysis.append("\nTop Sector Allocations:")
        for alloc in allocations[:3]:
            analysis.append(f"- {alloc['sector']}: {alloc['percentage']}%")
            
        analysis.append("\nCurrent Holdings Summary:")
        for h in holdings:
            sym = h.stock.symbol
            q = quote_map.get(sym, {})
            current_price = q.get('price', 'N/A')
            analysis.append(f"- {sym}: {h.current_holding} shares (Avg cost: {h.avg_price}, Current: {current_price})")
            
        return "\n".join(analysis)
    except Exception as e:
        return f"Error analyzing portfolio: {str(e)}"

from langchain_core.tools import tool
from utils.yahoo_finance import get_quotes

@tool
def risk_analysis_tool(symbol: str):
    """
    Analyzes the risk associated with a specific stock based on its fundamentals.
    Input should be a stock symbol (e.g., 'AAPL', 'RELIANCE.NS').
    """
    try:
        quotes = get_quotes([symbol])
        if not quotes or not quotes[0]:
            return f"Could not find fundamental data for {symbol} to perform risk analysis."
            
        q = quotes[0]
        
        # Extract basic metrics for risk
        pe = q.get('trailingPE', 'N/A')
        beta = q.get('beta', 'N/A') # yfinance info usually has beta, but our map might not. Let's rely on PE and 52w high/low
        high = q.get('fiftyTwoWeekHigh', 'N/A')
        low = q.get('fiftyTwoWeekLow', 'N/A')
        current = q.get('price', 'N/A')
        
        analysis = [f"Risk Analysis for {symbol} ({q.get('name', '')}):"]
        
        analysis.append(f"- Current Price: {current}")
        analysis.append(f"- 52 Week Range: {low} to {high}")
        
        if pe != 'N/A':
            try:
                pe_float = float(pe)
                if pe_float > 30:
                    analysis.append(f"- P/E Ratio: {pe} (High - Indicates growth expectations but higher valuation risk)")
                elif pe_float < 15:
                    analysis.append(f"- P/E Ratio: {pe} (Low - Might indicate value stock or underlying issues)")
                else:
                    analysis.append(f"- P/E Ratio: {pe} (Moderate)")
            except:
                pass
                
        analysis.append("- Note: This is a basic fundamental snapshot. Consider broader market conditions, sector trends, and company-specific news.")
        
        return "\n".join(analysis)
    except Exception as e:
        return f"Error performing risk analysis: {str(e)}"

import json
from langchain_core.tools import tool
from utils.yahoo_finance import get_quotes, search_stock, get_historic_data

@tool
def market_news_tool(query: str):
    """
    Fetches the latest news related to a given stock symbol or market query.
    Input should be a stock symbol (e.g., 'AAPL', 'RELIANCE.NS') or a market term.
    """
    try:
        # We use the search_stock utility which fetches news via yfinance
        result = search_stock(query)
        news_items = result.get('news', [])
        
        if not news_items:
            return f"No recent news found for {query}."
            
        formatted_news = []
        for i, item in enumerate(news_items[:5]):
            title = item.get('title', 'No Title')
            link = item.get('link', '#')
            publisher = item.get('publisher', 'Unknown Publisher')
            formatted_news.append(f"{i+1}. {title} (Published by {publisher}) - Link: {link}")
            
        return "\n".join(formatted_news)
    except Exception as e:
        return f"Error fetching news: {str(e)}"

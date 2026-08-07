import yfinance as yf
from datetime import datetime


def map_stock_data(info):
    """Map yfinance info dict to our standard format."""
    
    def format_timestamp(ts):
        if not ts: return 'N/A'
        try:
            # yfinance sometimes returns int timestamps or datetime objects
            if isinstance(ts, (int, float)):
                dt = datetime.fromtimestamp(ts)
                return dt.strftime('%d-%b-%Y %H:%M')
            elif isinstance(ts, datetime):
                return ts.strftime('%d-%b-%Y %H:%M')
        except:
            pass
        return str(ts)

    def safe_format(val, decimals=2):
        if val is None: return 'N/A'
        try:
            return f"{float(val):.{decimals}f}"
        except:
            return str(val)

    def format_large_number(val):
        if val is None: return 'N/A'
        try:
            return f"{int(val):,}"
        except:
            return str(val)

    return {
        # Basic Info
        'symbol': info.get('symbol', 'N/A'),
        'name': info.get('shortName', 'N/A'),
        'longName': info.get('longName', 'N/A'),
        'exchange': info.get('exchange', 'N/A'),
        'quoteType': info.get('quoteType', 'N/A'),
        'currency': info.get('currency', 'N/A'),

        # Market Data
        'price': safe_format(info.get('currentPrice', info.get('regularMarketPrice'))),
        'change': safe_format(info.get('regularMarketChange', 0)),
        'changePercent': safe_format(info.get('regularMarketChangePercent', 0)),
        'dayHigh': safe_format(info.get('dayHigh', info.get('regularMarketDayHigh'))),
        'dayLow': safe_format(info.get('dayLow', info.get('regularMarketDayLow'))),
        'previousClose': safe_format(info.get('previousClose', info.get('regularMarketPreviousClose'))),
        'open': safe_format(info.get('open', info.get('regularMarketOpen'))),
        
        # Volume & Market Cap
        'volume': format_large_number(info.get('volume', info.get('regularMarketVolume'))),
        'marketCap': format_large_number(info.get('marketCap')),
        'sharesOutstanding': format_large_number(info.get('sharesOutstanding')),

        # 52-Week Range
        'fiftyTwoWeekHigh': safe_format(info.get('fiftyTwoWeekHigh')),
        'fiftyTwoWeekLow': safe_format(info.get('fiftyTwoWeekLow')),
        'fiftyTwoWeekRange': f"{safe_format(info.get('fiftyTwoWeekLow'))} - {safe_format(info.get('fiftyTwoWeekHigh'))}",
        
        # Averages
        'fiftyDayAverage': safe_format(info.get('fiftyDayAverage')),
        'twoHundredDayAverage': safe_format(info.get('twoHundredDayAverage')),
        
        # Timestamps
        'marketTime': 'N/A',  # Not reliably provided by yfinance in info dict
        'earningsTimestamp': format_timestamp(info.get('earningsTimestamp')),

        # Financial Ratios
        'trailingPE': safe_format(info.get('trailingPE')),
        'forwardPE': safe_format(info.get('forwardPE')),
        'epsTrailingTwelveMonths': safe_format(info.get('trailingEps')),
        'priceToBook': safe_format(info.get('priceToBook')),
        'bookValue': safe_format(info.get('bookValue')),
        
        # Dividends
        'dividendYield': safe_format(info.get('dividendYield')),
        'dividendRate': safe_format(info.get('dividendRate')),
        
        # Other
        'averageAnalystRating': info.get('recommendationKey', 'N/A'),
        'marketState': 'N/A',
    }


def get_quotes(symbols):
    """Fetch basic quote info for a list of symbols."""
    if not symbols:
        return []
        
    try:
        # yfinance download handles multiple symbols efficiently
        data = yf.download(symbols, period="1d", group_by="ticker", threads=True, progress=False)
        results = []
        
        # Check if multiple symbols or just one
        if isinstance(symbols, str):
            symbols = [symbols]
            
        for sym in symbols:
            try:
                ticker = yf.Ticker(sym)
                info = ticker.info
                mapped = map_stock_data(info)
                results.append(mapped)
            except Exception as e:
                print(f"Error fetching quote for {sym}: {e}")
                
        return results
    except Exception as e:
        print(f"Error in get_quotes: {e}")
        return []


def search_stock(query):
    """Search for stocks matching query (mocking yahooFinance.search)."""
    # yfinance doesn't have a direct search method, we'll try to get quote directly
    # or rely on an external API for proper search. For now, we'll attempt to fetch it directly.
    try:
        ticker = yf.Ticker(query)
        info = ticker.info
        if 'symbol' in info:
            return {
                'quotes': [map_stock_data(info)],
                'news': ticker.news[:5] if hasattr(ticker, 'news') else []
            }
    except:
        pass
    return {'quotes': [], 'news': []}


def get_historic_data(symbol, period1, period2, interval):
    """Fetch historical stock data."""
    try:
        ticker = yf.Ticker(symbol)
        
        # Convert JS timestamps to dates
        start = datetime.fromtimestamp(int(period1)).strftime('%Y-%m-%d')
        end = datetime.fromtimestamp(int(period2)).strftime('%Y-%m-%d')
        
        # yfinance interval mapping
        # yf valid intervals: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo
        # JS interval might be like '1d', '1wk', '1mo'
        df = ticker.history(start=start, end=end, interval=interval)
        
        results = []
        for index, row in df.iterrows():
            results.append({
                'date': index.isoformat(),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume']),
            })
            
        return results
    except Exception as e:
        print(f"Error fetching historic data for {symbol}: {e}")
        return []

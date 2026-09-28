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
            return str(int(val))
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
    """Fetch basic quote info for a list of symbols efficiently with caching."""
    if not symbols:
        return []
        
    if isinstance(symbols, str):
        symbols = [symbols]
        
    from django.core.cache import cache
    
    # Sort symbols so the cache key is consistent regardless of order
    sorted_symbols = sorted(symbols)
    cache_key = f"quotes_{'_'.join(sorted_symbols)}"
    # Limit key length in case of many symbols
    if len(cache_key) > 200:
        import hashlib
        cache_key = f"quotes_{hashlib.md5('_'.join(sorted_symbols).encode()).hexdigest()}"
        
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
        
    results = []
    
    # 1. Download recent history for all symbols in one fast request!
    # period="5d" ensures we have previous close even on Mondays or after holidays
    try:
        data = yf.download(symbols, period="5d", group_by="ticker", threads=True, progress=False)
    except Exception as e:
        print(f"yfinance download failed: {e}")
        data = None

    for sym in symbols:
        mapped = map_stock_data({})
        mapped['symbol'] = sym
        mapped['name'] = sym
        
        try:
            # Attempt to safely get fast_info if available (1 fast request)
            ticker = yf.Ticker(sym)
            
            # fast_info is a lazy dictionary, accessing keys might trigger a fast request
            if hasattr(ticker, 'fast_info'):
                fi = ticker.fast_info
                
                # We wrap in try-except because fi keys can throw if data is missing
                try: mapped['price'] = f"{float(fi['lastPrice']):.2f}" 
                except: pass
                
                try: mapped['previousClose'] = f"{float(fi['previousClose']):.2f}" 
                except: pass
                
                try: mapped['volume'] = str(int(fi['lastVolume'])) 
                except: pass
                
                try: mapped['exchange'] = str(fi.get('exchange', 'N/A')) 
                except: pass
                
                try: mapped['currency'] = str(fi.get('currency', 'N/A'))
                except: pass
                
                try: mapped['dayHigh'] = f"{float(fi['dayHigh']):.2f}"
                except: pass
                
                try: mapped['dayLow'] = f"{float(fi['dayLow']):.2f}"
                except: pass
                
                if mapped.get('dayHigh') != 'N/A' and mapped.get('dayLow') != 'N/A':
                    mapped['dayRange'] = f"{mapped['dayLow']} - {mapped['dayHigh']}"
                
                try: mapped['fiftyTwoWeekHigh'] = f"{float(fi['year_high']):.2f}"
                except: pass
                
                try: mapped['fiftyTwoWeekLow'] = f"{float(fi['year_low']):.2f}"
                except: pass
                
                if mapped.get('fiftyTwoWeekHigh') != 'N/A' and mapped.get('fiftyTwoWeekLow') != 'N/A':
                    mapped['fiftyTwoWeekRange'] = f"{mapped['fiftyTwoWeekLow']} - {mapped['fiftyTwoWeekHigh']}"
                    
                try: 
                    mc = int(fi['market_cap'])
                    mapped['marketCap'] = str(mc)
                except: pass

            # Fallback to yf.download data if fast_info failed or was incomplete!
            if data is not None and not data.empty:
                if len(symbols) == 1:
                    df = data
                else:
                    df = data[sym] if sym in data.columns.levels[0] else None
                    
                if df is not None and not df.empty:
                    closes = df['Close'].dropna()
                    vols = df['Volume'].dropna()
                    
                    if mapped['price'] == 'N/A' and len(closes) >= 1:
                        mapped['price'] = f"{float(closes.iloc[-1]):.2f}"
                        
                    if mapped['previousClose'] == 'N/A' and len(closes) >= 2:
                        mapped['previousClose'] = f"{float(closes.iloc[-2]):.2f}"
                        
                    if mapped['volume'] == 'N/A' and len(vols) >= 1:
                        mapped['volume'] = str(int(vols.iloc[-1]))
            
            # Calculate Change and Change Percent based on price and previousClose!
            if mapped['price'] != 'N/A' and mapped['previousClose'] != 'N/A':
                price = float(mapped['price'])
                prev = float(mapped['previousClose'])
                change = price - prev
                pct = (change / prev) * 100 if prev != 0 else 0
                mapped['change'] = f"{change:.2f}"
                mapped['changePercent'] = f"{pct:.2f}"

            results.append(mapped)
        except Exception as e:
            print(f"Error processing {sym}: {e}")
            results.append(mapped)

    # Cache the results for 2 minutes (120 seconds) to prevent spamming Yahoo Finance
    if results:
        cache.set(cache_key, results, timeout=120)

    return results


import requests

def search_stock(query):
    """Search for stocks matching query using Yahoo Finance search API."""
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            quotes = data.get('quotes', [])
            indian_quotes = [
                q for q in quotes 
                if (q.get('exchange') in ['NSI', 'BSE'] or q.get('symbol', '').endswith(('.NS', '.BO'))) 
                and q.get('quoteType') == 'EQUITY'
            ]
            
            # Smart Fallback: If Yahoo Finance returned no Indian equities,
            # it might be because the query is too short (e.g., "d") and US stocks pushed Indian stocks out of the top 7.
            # Retry with " india" appended.
            if not indian_quotes and "india" not in query.lower():
                fallback_url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query} india"
                fallback_response = requests.get(fallback_url, headers=headers, timeout=5)
                if fallback_response.status_code == 200:
                    fallback_data = fallback_response.json()
                    fallback_quotes = fallback_data.get('quotes', [])
                    indian_quotes = [
                        q for q in fallback_quotes 
                        if (q.get('exchange') in ['NSI', 'BSE'] or q.get('symbol', '').endswith(('.NS', '.BO'))) 
                        and q.get('quoteType') == 'EQUITY'
                    ]

            return {
                'quotes': indian_quotes,
                'news': data.get('news', [])
            }
    except Exception as e:
        print(f"Error in search_stock: {e}")
        
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

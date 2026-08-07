import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard-Header.css';
import growthicon from '../assets/growthicon.svg';
import { useAppContext } from "../context/AppContext.jsx";

//Enable cookies for all axios requests (important for auth sessions)
axios.defaults.withCredentials = true;

//Backend API URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
const STOCK_API = `${BACKEND_URL}/dashboard/starter/`;

const DashboardHeader = ({ isWatchlistPage = false, onAddToWatchlist = null }) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const navigate = useNavigate();
  const { isSearchActive, setIsSearchActive, headerStocks, setHeaderStocks, headerStocksTimestamp, setHeaderStocksTimestamp } = useAppContext();

  const handleFocus = () => setIsSearchActive(true);
  const handleClose = () => {setIsSearchActive(false); setQuery(''); setSearchResults([]);}

  // Fetch stock data from backend (session cookie included)
  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(STOCK_API);

      if (res.data?.data && Array.isArray(res.data.data)) {
        const stockData = res.data.data.slice(0, 3); //show top 3 stocks
        setStocks(stockData);
        // Cache in context
        setHeaderStocks(stockData);
        setHeaderStocksTimestamp(Date.now());
        console.log(stockData);
      } else {
        setError('Invalid data format from server.');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load market data.');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    // Clear previous timer
    if (typingTimeout) clearTimeout(typingTimeout);

    // Debounce execution
    const timer = setTimeout(() => {
      if (value.trim().length > 0) {
        fetchSearchResults(value.trim());
      } else {
        setSearchResults([]);
      }
    }, 300);
    setTypingTimeout(timer);
    };
    const fetchSearchResults = async (q) => {
      try {
        const res = await axios.get(`${BACKEND_URL}/dashboard/search/`, {
          params: { ticker: q },
          withCredentials: true
        });
        if (Array.isArray(res.data?.suggestions)) {
          setSearchResults(res.data.suggestions);
          console.log(res.data.suggestions)
        } else {
        setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      }
    };
    
    const handleAddStock = async (e, symbol) => {
      
      e.stopPropagation();
        await onAddToWatchlist(symbol);
        setIsSearchActive(false);
        setSearchResults([]);
       setQuery('');
    };

  useEffect(() => {
    // Check if we have cached data that's less than 5 minutes old
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();
    
    if (headerStocks && headerStocksTimestamp && (now - headerStocksTimestamp) < CACHE_DURATION) {
      // Use cached data
      setStocks(headerStocks);
      setLoading(false);
    } else {
      // Fetch fresh data
      fetchStockData();
    }
    // Optionally auto-refresh every minute:
    // const interval = setInterval(fetchStockData, 60000);
    // return () => clearInterval(interval);
  }, []);
    useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setIsSearchActive(false);
        setQuery('');
        setSearchResults([]);
      }
    };

    window.addEventListener('keydown', onEsc);

    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const handleStockClick = (symbol) => {
      navigate(`/stockdetails/${symbol}`);
      setIsSearchActive(false);
      setQuery('');
      setSearchResults([]);
    };

  // Error state
  if (error)
    return (
      <div className="dashboard-header dashboard-header-error">
        <p>{error}</p>
      </div>
    );

  return (
    <>
      {isSearchActive && <div className="overlay" onClick={handleClose}></div>}

      <div className="dashboard-header">
        {/*  Dynamic stock data display */}
        
        <div className="d-stock-display-container">
          {loading ? (
            // ⭐ show skeletons while loading
            <div className="d-stock-display-container">
              {Array.from({ length: 3 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  <div className="d-stock-info">
                    <div className="d-stock-header">
                      <span className="d-stock-name">
                        <div className="skeleton skeleton-text medium"></div>
                      </span>

                      <span className="d-stock-exchange">
                        <div className="skeleton skeleton-text very-short"></div>
                      </span>
                    </div>

                    <div className="d-stock-details">
                      <span className="d-stock-price">
                        <div className="skeleton skeleton-text short"></div>
                      </span>

                      <span className="d-stock-change">
                        <div className="skeleton skeleton-text short"></div>
                      </span>
                    </div>
                  </div>

                  {idx < 2 && <span className="divider">|</span>}
                </React.Fragment>
              ))}
            </div>

          ) : (<>

          {stocks.length > 0 ? (
            stocks.map((stock, index) => {
              const isNegative = Number(stock.change) < 0;
              const stockSymbol = stock.Symbol || stock.symbol;
              return (
                <React.Fragment key={stockSymbol || index}>
                  <div 
                    className="d-stock-info"
                  >
                    <div className="d-stock-header">
                      <span className="d-stock-name">
                        {stock.name ? stock.name : 'N/A'}
                      </span>
                      <span className="d-stock-exchange">{stock.exchange || '-'}</span>
                    </div>
                    <div className="d-stock-details">
                      <span className="d-stock-price">
                        {stock.price !== 'N/A'
                          ? Number(stock.price).toLocaleString()
                          : 'N/A'}
                        <span
                          className={`d-change-icon pi ${
                            isNegative ? 'pi-arrow-down negative' : 'pi-arrow-up positive'
                          }`}
                        ></span>
                      </span>
                      <span
                        className={`d-stock-change ${
                          isNegative ? 'negative' : 'positive'
                        }`}
                      >
                        <span className="d-change-text">
                          {`${stock.change} (${stock.changePercent}%)`}
                        </span>
                      </span>
                    </div>
                  </div>
                  {index < stocks.length - 1 && <span className="divider">|</span>}
                </React.Fragment>
              );
            })
          ) : (
            <p className="no-stocks">No active stock data available</p>
          )}
          </>
        )}
        </div>

        {/* Search Bar */}
        <div className="searchbar">
          <i className="pi pi-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search for a Stock (e.g., RELIANCE.NS, TATA MOTORS)"
            onFocus={handleFocus}
          />
        </div>
      </div>

      {/* Search Popup */}
      {isSearchActive && (
        <div className="search-popup">
          <div className="search-popup-header">
            <i className="pi pi-search popup-search-icon"></i>
            <input
              type="text"
              className="popup-search-input"
              placeholder="Search for a Stock (e.g., RELIANCE.NS, TATA MOTORS)"
              autoFocus
              value={query}
              onChange={handleSearchChange}
            />
          </div>
          <div className="search-results">
            {query.length > 0 && searchResults.length === 0 && (
              <p className="no-results">No matching stocks found.</p>
            )}
            {searchResults.length > 0 && (
              <ul className="results-list">
                {searchResults.map((item) => (
                  <li
                    key={item.symbol}
                    className="result-item"
                    onClick={() => handleStockClick(item.symbol)}
                    role="button"
                    tabIndex={0}
                  >
                    <img src={growthicon} alt="Stock" />
                    <div className="result-meta">
                      <span className="result-name">{item.longname || item.shortname}</span>
                    </div>
                    {isWatchlistPage && onAddToWatchlist && (
                      <button
                        className="add-to-watchlist-btn"
                        onClick={(e) => handleAddStock(e, item.symbol)}
                        aria-label={`Add ${item.symbol} to watchlist`}
                      >
                        <i className="pi pi-plus"></i>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardHeader;

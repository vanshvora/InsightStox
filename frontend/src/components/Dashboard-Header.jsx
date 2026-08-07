import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import './Dashboard-Header.css';
import growthicon from '../assets/growthicon.svg';
import { useAppContext } from "../context/AppContext.jsx";

//Enable cookies for all axios requests (important for auth sessions)
axios.defaults.withCredentials = true;

//Backend API URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
const STOCK_API = `${BACKEND_URL}/dashboard/starter/`;

const DashboardHeader = ({ isWatchlistPage = false, onAddToWatchlist = null }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const navigate = useNavigate();
  const { isSearchActive, setIsSearchActive } = useAppContext();

  const handleFocus = () => setIsSearchActive(true);
  const handleClose = () => {setIsSearchActive(false); setQuery(''); setSearchResults([]);}

  // Fetch stock data from backend using React Query for automatic caching
  const { data: stocks = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['dashboardHeaderStocks'],
    queryFn: async () => {
      const res = await axios.get(STOCK_API);
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data.slice(0, 3); // show top 3 stocks
      }
      throw new Error('Invalid data format from server.');
    }
  });

  const error = queryError ? (queryError.response?.status === 401 ? 'Session expired. Please log in again.' : 'Failed to load market data.') : null;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim().length > 0) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
    
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
          params: { query: q },
          withCredentials: true
        });
        if (Array.isArray(res.data?.data)) {
          setSearchResults(res.data.data);
          console.log(res.data.data)
        } else {
        setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    const handleAddStock = async (e, symbol) => {
      e.stopPropagation();
      if (onAddToWatchlist) {
        await onAddToWatchlist(symbol);
      } else {
        try {
          await axios.post(`${BACKEND_URL}/dashboard/watchlist/add/`, { symbol }, { withCredentials: true });
        } catch (err) {
          console.error("Failed to add stock:", err);
        }
      }
      setIsSearchActive(false);
      setSearchResults([]);
      setQuery('');
    };
    


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
            Array.from({ length: 3 }).map((_, idx) => (
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
            ))
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
            {isSearching && (
              <p className="no-results">Searching market data...</p>
            )}
            {!isSearching && query.length > 0 && searchResults.length === 0 && (
              <p className="no-results">No matching stocks found.</p>
            )}
            {!isSearching && searchResults.length > 0 && (
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

import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import './WatchList.css'
import Navbar from '../components/Navbar.jsx'
import { useAppContext } from "../context/AppContext.jsx";
import DashboardHeader from '../components/Dashboard-Header.jsx';
import Footer from '../components/Footer.jsx';
import filterIcon from '../assets/filter-button.svg';
import axios from "axios";
import {useNavigate} from 'react-router-dom';
const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
const Watchlist_API = `${BACKEND_URL}/dashboard/watchlist/`;


const  Watchlist= () => {
  const queryClient = useQueryClient();
  const { darkMode, setDarkMode, setIsSearchActive, ensureAuth, userDetails} = useAppContext();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [watchlistData, setwatchlistData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchData, setSearchData] = useState([]);   
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAlertPopup, setActiveAlertPopup] = useState(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState("ABOVE");
  const navigate = useNavigate();
  const { data: queryData = [], isLoading, refetch: fetchWatchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await axios.get(Watchlist_API, { withCredentials: true });
      const data = res.data?.data || [];
      return data.map((item) => ({
        company: item.name || item.shortName,
        symbol: item.symbol,
        price: item.price || item.currentPrice,
        change: item.change || item.currentchange,
        changePercent: item.changePercent || item.percentageChange,
        sector: item.sector || 'N/A',
        marketcap: item.marketCap || item.marketcap
      }));
    }
  });
  
  const { data: alertsData = [], refetch: fetchAlerts } = useQuery({
    queryKey: ['price_alerts'],
    queryFn: async () => {
      const res = await axios.get(`${BACKEND_URL}/dashboard/alerts/`, { withCredentials: true });
      return res.data?.data || [];
    }
  });

  const isWatchlistEmpty = !isLoading && watchlistData.length === 0;
  useEffect(() => {
    if (queryData && queryData.length > 0) {
      setwatchlistData(queryData);
      setFilteredData(queryData);
      setSearchData(queryData);
    } else if (queryData && queryData.length === 0) {
      setwatchlistData([]);
      setFilteredData([]);
      setSearchData([]);
    }
  }, [queryData]);
  const handleRemoveStock= async (symbol) => {
    try{
      const updatedData = watchlistData.filter(stock => stock.symbol !== symbol);
      const updatedFiltered = filteredData.filter(stock => stock.symbol !== symbol);
      const updatedSearch = searchData.filter(stock => stock.symbol !== symbol);
      setwatchlistData(updatedData);
      setFilteredData(updatedFiltered);
      setSearchData(updatedSearch);
      
      // Forcefully update the React Query cache so Local Storage syncs instantly
      queryClient.setQueryData(['watchlist'], (old) => 
        old ? old.filter(stock => stock.symbol !== symbol) : []
      );

      await axios.delete(`${BACKEND_URL}/dashboard/watchlist/remove/?symbol=${symbol}`, { withCredentials: true });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      fetchAlerts();
    }
    catch(err){
      console.error("Error removing stock:", err);
      // If backend call fails, revert by refetching to restore data
      if (err.response?.status !== 200) fetchWatchlist();    }
  }
  
  const handleAddToWatchlist = async (symbol) => {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/dashboard/watchlist/add/`,
        { symbol },
        { withCredentials: true }
      );
      console.log("Added to watchlist:", res.data);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      await fetchWatchlist();
    } catch (err) {
      console.error("Error adding stock to watchlist:", err.response?.data || err);
    }
  };
    const handleStockClick = (symbol) => {
      navigate(`/stockdetails/${symbol}`);
    };  
    
    const toggleAlertPopup = (symbol) => {
      if (activeAlertPopup === symbol) {
        setActiveAlertPopup(null);
      } else {
        const existingAlert = alertsData.find(a => a.symbol === symbol && a.is_active);
        setActiveAlertPopup(symbol);
        if (existingAlert) {
            setAlertTargetPrice(existingAlert.target_price);
            setAlertCondition(existingAlert.condition);
        } else {
            setAlertTargetPrice("");
            setAlertCondition("ABOVE");
        }
      }
    };

    const handleDeleteAlert = async (symbol) => {
      const existingAlert = alertsData.find(a => a.symbol === symbol && a.is_active);
      if (!existingAlert) return;
      try {
        await axios.delete(
          `${BACKEND_URL}/dashboard/alerts/`,
          { data: { id: existingAlert.id }, withCredentials: true }
        );
        setActiveAlertPopup(null);
        fetchAlerts();
        console.log("Alert deleted successfully");
      } catch (err) {
        console.error("Error deleting alert:", err);
      }
    };

    const handleSetAlert = async (e, symbol) => {
      e.preventDefault();
      try {
        await axios.post(
          `${BACKEND_URL}/dashboard/alerts/`,
          { symbol: symbol, target_price: alertTargetPrice, condition: alertCondition },
          { withCredentials: true }
        );
        setActiveAlertPopup(null);
        fetchAlerts();
        console.log("Alert set successfully");
      } catch (err) {
        console.error("Error setting alert:", err);
      }
    };
    
    const [filters, setFilters] = useState({
    dailyChange: '',
    dailyChangePercent: '',
    priceFrom: '',
    priceUpto: '',
    sectors: [],
    marketCap: [],
    sortBy: ''
  });


  useEffect(() => {
             // Run an initial check: this page is an auth/home page, so pass true
          (async () => {
            try {
              await ensureAuth(navigate, false);
            } catch (e) {
              console.error("ensureAuth initial check failed:", e);
            }
          })();
    
          const intervalId = setInterval(() => {
            ensureAuth(navigate, false).catch((e) => console.error(e));
          }, 60000);
    
          return () => {
            clearInterval(intervalId);
          };
    },  [navigate, ensureAuth]);

  // Removed empty fetchWatchlist useEffect since useQuery handles initial fetch
  const sectors = [
    'Technology / IT', 'Communication Services', 'Materials & Mining',
    'Consumer Cyclical', 'Consumer Defensive', 'Basic Materials',
    'Financial Services', 'Real Estate', 'Healthcare / Pharmaceuticals',
    'Energy / Oil & Gas', 'Utilities / Power', 'Industrials', 'Others'
  ];

  const toggleSector = (sector) => {
    setFilters(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
      ? prev.sectors.filter(s => s !== sector)
        : [...prev.sectors, sector]
    }));
  };

  const toggleMarketCap = (cap) => {
    setFilters(prev => ({
      ...prev,
      marketCap: prev.marketCap.includes(cap)
        ? prev.marketCap.filter(c => c !== cap)
        : [...prev.marketCap, cap]
    }));
  };

  const getMarketCapCategory = (marketcap) => {
    if (!marketcap) return null;
    const cap = Number(marketcap);
    if (cap < 50000000000) return 'small';
    if (cap < 200000000000) return 'mid';
    return 'large';
  };
const handleSearch = (value) => {
  setSearchQuery(value);

  if (value.trim() === "") {
    setSearchData(filteredData);   // fallback to filter results
    return;
  }

  const lower = value.toLowerCase();

  const searched = filteredData.filter(stock =>
    stock.company.toLowerCase().includes(lower) ||
    stock.symbol.toLowerCase().includes(lower)
  );

  setSearchData(searched);
};

  const handleApplyFilters = () => {
    let filtered = [...watchlistData];
    
    // Check if any filters are actually applied
    const hasActiveFilters = 
      filters.dailyChange !== '' || 
      filters.dailyChangePercent !== '' || 
      filters.priceFrom !== '' || 
      filters.priceUpto !== '' || 
      filters.sectors.length > 0 || 
      filters.marketCap.length > 0 || 
      filters.sortBy !== '';
    
    setIsFiltersApplied(hasActiveFilters);

    // Filter by daily change (gainers/losers)
    if (filters.dailyChange === 'gainers') {
      filtered = filtered.filter(stock => stock.change > 0);
    } else if (filters.dailyChange === 'losers') {
      filtered = filtered.filter(stock => stock.change < 0);
    }

    // Filter by daily change percentage (gainers/losers)
    if (filters.dailyChangePercent === 'gainers') {
      filtered = filtered.filter(stock => stock.changePercent > 0);
    } else if (filters.dailyChangePercent === 'losers') {
      filtered = filtered.filter(stock => stock.changePercent < 0);
    }

    // Filter by price range
    if (filters.priceFrom) {
      filtered = filtered.filter(stock => stock.price >= Number(filters.priceFrom));
    }
    if (filters.priceUpto) {
      filtered = filtered.filter(stock => stock.price <= Number(filters.priceUpto));
    }

    // Filter by market cap
    if (filters.marketCap.length > 0) {
      filtered = filtered.filter(stock => {
        const capCategory = getMarketCapCategory(stock.marketcap);
        return filters.marketCap.includes(capCategory);
      });
    }

    // Filter by sectors
    if (filters.sectors.length > 0) {
      filtered = filtered.filter(stock => filters.sectors.includes(stock.sector));
    }

    // Sort by price or change percentage
    if (filters.sortBy === 'low-high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'high-low') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'low-high-percent') {
      filtered.sort((a, b) => a.changePercent - b.changePercent);
    } else if (filters.sortBy === 'high-low-percent') {
      filtered.sort((a, b) => b.changePercent - a.changePercent);
    }

    setFilteredData(filtered);
    setSearchData(filtered);   // reset search results to filtered
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      dailyChange: '',
      dailyChangePercent: '',
      priceFrom: '',
      priceUpto: '',
      sectors: [],
      marketCap: [],
      sortBy: ''
    });
    setPriceError('');
    setFilteredData(watchlistData);
    setSearchData(watchlistData);
    setIsFiltersApplied(false);
  };

  return (
    <div className="watchlist">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} pageType="watchlist" 
      profileData={{name: userDetails?.name?.split(" ")[0] || "Guest",email: userDetails?.email || "N/A"}}/>
      
      <DashboardHeader 
        darkMode={darkMode} 
        isWatchlistPage={true}
        onAddToWatchlist={handleAddToWatchlist}
      />
      
      <div className="watchlist-content">

         <div className="watchlist-title">
            <h1>Your Watchlist</h1>
            <p>Track your favorite stocks and monitor their performance</p>
          </div>
          
          <div className={`search-container  ${isWatchlistEmpty ? 'watchlist-hidden' : ''}`}>
              <i className="pi pi-search"></i>
              <input 
                type="text" 
                placeholder="Search your stock"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button className="filter-btn" aria-label="Open Filters" onClick={() => setIsFilterOpen(true)}> 
                <img src={filterIcon} alt="filter-icon" />
              </button>
            
            </div>
       

        {/* Watchlist Table */}
        {(isLoading || watchlistData.length > 0) && (
          <div className="watchlist-table-container">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`}>
                      <td>
                        <div className="company-cell">
                          <div className="skeleton " data-testid="skeleton"style={{ width: '60%', height: 14 }}></div>
                          <div className="skeleton" data-testid="skeleton"style={{ width: '36%', height: 14, marginTop: 6 }}></div>
                        </div>
                      </td>
                      <td>
                        <div className="skeleton" data-testid="skeleton"style={{ width: '40%', height: 14 }}></div>
                      </td>
                      <td>
                        <div className="skeleton" data-testid="skeleton"style={{ width: '40%', height: 14 }}></div>
                        <div className="skeleton change-cell-after" style={{ width: '60%', height: 12, marginTop: 6 }}></div>
                      </td>
                      <td>
                        <div className="skeleton" data-testid="skeleton"style={{ width: '60%', height: 14 }}></div>
                      </td>
                      <td>
                        <div className="skeleton" data-testid="skeleton"style={{ width: 64, height: 28, borderRadius: 9999 }}></div>
                      </td>
                    </tr>
                  ))
                ) : searchData.length === 0 ? (
                  <tr className="no-results-row">
                    <td colSpan="5" className="no-results-cell">
                      No stocks matched your filters
                    </td>
                  </tr>
                ) : (
                  searchData.map((stock) => {
                    const hasAlert = alertsData.some(a => a.symbol === stock.symbol && a.is_active);
                    return (
                    <tr key={stock.symbol} className="table-stock" onClick={() => handleStockClick(stock.symbol)} style={{cursor: 'pointer'}}>
                      <td>
                        <div className="company-cell">
                          <span className="company-name">{stock.company}</span>
                        </div>
                      </td>
                      <td>
                        <span className="company-symbol">{stock.symbol}</span>
                      </td>
                      <td>
                        <span className="price-cell">{parseFloat(stock.price || 0).toFixed(2)}</span>
                         <span className={`change-cell ${parseFloat(stock.change || 0) >= 0 ? 'change-positive' : 'change-negative'} change-cell-after`}>
                          {parseFloat(stock.change || 0) >= 0 ? '+' : ''}{parseFloat(stock.change || 0).toFixed(2)} ({parseFloat(stock.changePercent || 0) >= 0 ? '+' : ''}{parseFloat(stock.changePercent || 0).toFixed(2)}%)
                        </span>
                      </td>
                      <td>
                        <span className={`change-cell ${parseFloat(stock.change || 0) >= 0 ? 'change-positive' : 'change-negative'}`}>
                          {parseFloat(stock.change || 0) >= 0 ? '+' : ''}{parseFloat(stock.change || 0).toFixed(2)} ({parseFloat(stock.changePercent || 0) >= 0 ? '+' : ''}{parseFloat(stock.changePercent || 0).toFixed(2)}%)
                        </span>
                      </td>
                      <td style={{ position: 'relative' }}>
                        <button 
                          className="action-btn"
                          aria-label={`Set alert for ${stock.symbol}`} 
                          onClick={(e) => {e.stopPropagation(); toggleAlertPopup(stock.symbol);}}
                          style={{ marginRight: '10px' }}
                        >
                          {hasAlert ? <i className="pi pi-pencil" style={{ color: '#eab308' }}></i> : <i className="pi pi-bell"></i>}
                        </button>
                        <button 
                          className="action-btn"
                          aria-label={`Remove ${stock.symbol} from watchlist`} 
                           onClick={(e) => {e.stopPropagation(); handleRemoveStock(stock.symbol);}}
                        >
                         <span>Remove</span>
                        </button>
                        
                        {/* Inline Alert Popup */}
                        {activeAlertPopup === stock.symbol && (
                          <div 
                            className="inline-alert-popup" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="popup-header">
                              Set Alert for {stock.symbol}
                              <button aria-label="Close Alert" className="close-popup-btn" onClick={() => setActiveAlertPopup(null)}>
                                <i className="pi pi-times"></i>
                              </button>
                            </div>
                            <form onSubmit={(e) => handleSetAlert(e, stock.symbol)}>
                              <div className="popup-group">
                                <label style={{ marginBottom: '4px' }}>Condition</label>
                                <div className="popup-radio-group">
                                  <div className="filter-option">
                                    <input 
                                      type="radio" 
                                      id={`above-${stock.symbol}`}
                                      checked={alertCondition === 'ABOVE'} 
                                      onChange={() => setAlertCondition('ABOVE')} 
                                    />
                                    <label htmlFor={`above-${stock.symbol}`}>Above</label>
                                  </div>
                                  <div className="filter-option">
                                    <input 
                                      type="radio" 
                                      id={`below-${stock.symbol}`}
                                      checked={alertCondition === 'BELOW'} 
                                      onChange={() => setAlertCondition('BELOW')} 
                                    />
                                    <label htmlFor={`below-${stock.symbol}`}>Below</label>
                                  </div>
                                </div>
                              </div>
                              <div className="popup-group" style={{ marginTop: '0.8rem' }}>
                                <label>Target (₹)</label>
                                <input 
                                  type="number" step="0.01" required placeholder="e.g. 3000"
                                  value={alertTargetPrice} onChange={e => setAlertTargetPrice(e.target.value)}
                                  className="popup-input"
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '1.2rem' }}>
                                <button type="submit" className="popup-submit-btn" style={{ margin: 0, flex: 1 }}>Save</button>
                                {hasAlert && (
                                  <button type="button" className="popup-submit-btn" style={{ margin: 0, flex: 1, background: '#ef4444', color: '#fff' }} onClick={() => handleDeleteAlert(stock.symbol)}>
                                    Remove
                                  </button>
                                )}
                              </div>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state only when watchlist itself is empty (no stocks at all) */}
        {!isLoading && isWatchlistEmpty && (
          <div className="watchlist-table-container watchlist-empty-container">
            <div className="watchlist-empty-state">
              <p className="watchlist-empty-title">Nothing in this watchlist yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="filter-modal-overlay overlay" role="button" aria-label="Close Filters Overlay" onClick={() => setIsFilterOpen(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h2>Filter Options</h2>
                  <button
                    aria-label="Close Filters"
                    className="close-btn"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    <i className="pi pi-times"></i>
                  </button>            
                  </div>

            <div className="filter-modal-content">
              {/* Daily Change */}
              <div className="filter-section">
                <div className="daily-change">
                <div className="filter-section-title">Daily change</div>
                <div className="filter-options">
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="gainers" 
                      name="dailyChange"
                      checked={filters.dailyChange === 'gainers'}
                      onChange={() => setFilters({...filters, dailyChange: 'gainers'})}
                    />
                    <label htmlFor="gainers">Gainers</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="losers" 
                      name="dailyChange"
                      checked={filters.dailyChange === 'losers'}
                      onChange={() => setFilters({...filters, dailyChange: 'losers'})}
                    />
                    <label htmlFor="losers">Losers</label>
                  </div>
                </div>
            </div>

              {/* Daily Change % */}
              <div className="daily-change-percentage">
             <div className="filter-section-title">Daily change (%)</div>
                <div className="filter-options">
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="gainers-percent" 
                      name="dailyChangePercent"
                      checked={filters.dailyChangePercent === 'gainers'}
                      onChange={() => setFilters({...filters, dailyChangePercent: 'gainers'})}
                    />
                    <label htmlFor="gainers-percent">Gainers</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="losers-percent" 
                      name="dailyChangePercent"
                      checked={filters.dailyChangePercent === 'losers'}
                      onChange={() => setFilters({...filters, dailyChangePercent: 'losers'})}
                    />
                    <label htmlFor="losers-percent">Losers</label>
                  </div>
                </div>
                </div>
              </div>


              {/* Price Range */}
              <div className="filter-section filter-section-second">
                <div className="price-range">
                <div className="filter-section-title">Price Range</div>
                <div className="price-range-inputs">
                      <div className="price-input-group">
                         <label htmlFor="price-from">From</label>
                        <input
                          id="price-from"
                          placeholder="10"
                          type="number"
                          value={filters.priceFrom}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFilters({ ...filters, priceFrom: value });

                            if (filters.priceUpto && Number(value) > Number(filters.priceUpto)) {
                              setPriceError('“From” cannot be greater than “Upto”.');
                            } else {
                              setPriceError('');
                            }
                          }}
                        />
                      </div>

                      <div className="price-input-group">
                          <label htmlFor="price-upto">Upto</label>
                          <input
                            id="price-upto"
                            placeholder="439"
                            type="number"
                            value={filters.priceUpto}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFilters({ ...filters, priceUpto: value });

                            if (filters.priceFrom && Number(value) < Number(filters.priceFrom)) {
                              setPriceError('“From” cannot be greater than “Upto”.');
                            } else {
                              setPriceError('');
                            }
                          }}
                        />
                      </div>


                </div>
              {priceError && <p className="price-error">{priceError}</p>}

                </div>


                {/* Sort By */}
                   <div className="sort-by">
                <div className="filter-section-title">Sort by</div>
                <div className="filter-options-sortby">
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="low-high" 
                      name="sortBy"
                      checked={filters.sortBy === 'low-high'}
                      onChange={() => setFilters({...filters, sortBy: 'low-high'})}
                    />
                    <label htmlFor="low-high">Low-High</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="high-low" 
                      name="sortBy"
                      checked={filters.sortBy === 'high-low'}
                      onChange={() => setFilters({...filters, sortBy: 'high-low'})}
                    />
                    <label htmlFor="high-low">High-Low</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="low-high-percent" 
                      name="sortBy"
                      checked={filters.sortBy === 'low-high-percent'}
                      onChange={() => setFilters({...filters, sortBy: 'low-high-percent'})}
                    />
                    <label htmlFor="low-high-percent">Low-High (%)</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="radio" 
                      id="high-low-percent" 
                      name="sortBy"
                      checked={filters.sortBy === 'high-low-percent'}
                      onChange={() => setFilters({...filters, sortBy: 'high-low-percent'})}
                    />
                    <label htmlFor="high-low-percent">High-Low (%)</label>
                  </div>
                </div>
              </div>
            </div>


              {/* Market Cap */}
              <div className="filter-section-market-cap">
                <div className="filter-section-title">Market Cap</div>
                <div className="filter-options">
                  <div className="filter-option">
                    <input 
                      type="checkbox" 
                      id="small-cap"
                      checked={filters.marketCap.includes('small')}
                      onChange={() => toggleMarketCap('small')}
                    />
                    <label htmlFor="small-cap">Small Cap</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="checkbox" 
                      id="mid-cap"
                      checked={filters.marketCap.includes('mid')}
                      onChange={() => toggleMarketCap('mid')}
                    />
                    <label htmlFor="mid-cap">Mid Cap</label>
                  </div>
                  <div className="filter-option">
                    <input 
                      type="checkbox" 
                      id="large-cap"
                      checked={filters.marketCap.includes('large')}
                      onChange={() => toggleMarketCap('large')}
                    />
                    <label htmlFor="large-cap">Large Cap</label>
                  </div>
                </div>
              </div>

              {/* Sector */}
              <div className="filter-section-sector">
                <div className="filter-section-title">Sector</div>
                <div className="sector-grid">
                  {sectors.map((sector, index) => (
                    <button
                      key={index}
                      className={`sector-btn ${filters.sectors.includes(sector) ? 'active' : ''}`}
                      onClick={() => toggleSector(sector)}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-modal-footer">
              <button className="clear-filter-btn" onClick={handleClearFilters}>
                Clear All
              </button>
              <button className="apply-filter-btn" onClick={handleApplyFilters}  disabled={!!priceError}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="footer-div">
        <Footer 
          darkMode={darkMode}  
          navigationLinks={[
            { text: "Portfolio", href: "/portfolio" },
            { text: "AI Insights", href: "/ai-insight" },
            { text: "Watchlist", href: "/watchlist" }
          ]}
          legalLinks={[
            { text: "Privacy Policy", href: "#privacy" },
            { text: "Terms Of Service", href: "#terms" },
            { text: "Contact Us", href: "#contact" },
          ]}
        />
      </div>
    </div>
  )
}

export default Watchlist;

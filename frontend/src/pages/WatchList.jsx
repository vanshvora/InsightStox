import React, { useEffect, useState } from 'react'
import './WatchList.css'
import Navbar from '../components/Navbar.jsx'
import { useAppContext } from "../context/AppContext.jsx";
import DashboardHeader from '../components/Dashboard-Header.jsx';
import Footer from '../components/Footer.jsx';
import filterIcon from '../assets/filter-button.svg';
import axios from "axios";
import {useNavigate} from 'react-router-dom';
const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
const Watchlist_API = `${BACKEND_URL}/api/v1/dashboard/displayWatchlist`;


const  Watchlist= () => {
  const { darkMode, setDarkMode, setIsSearchActive, ensureAuth, userDetails} = useAppContext();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [watchlistData, setwatchlistData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchData, setSearchData] = useState([]);   
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isWatchlistEmpty = !isLoading && watchlistData.length === 0;
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();


  // Filter states
  const fetchWatchlist = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(Watchlist_API);
      const data = res.data?.watchlist || [];

      const formattedData = data.map((item) => ({
        company: item.shortName,
        symbol: item.symbol,
        price: item.currentPrice,
        change: item.currentchange,
        changePercent: item.percentageChange,
        sector:item.sector,
        marketcap:item.marketcap
      }));
      
      setwatchlistData(formattedData);
      setFilteredData(formattedData);
      setSearchData(formattedData);
    } catch (err) {
      console.error("Error fetching watchlist:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleRemoveStock= async (symbol) => {
    try{
      const updatedData = watchlistData.filter(stock => stock.symbol !== symbol);
      const updatedFiltered = filteredData.filter(stock => stock.symbol !== symbol);
      const updatedSearch = searchData.filter(stock => stock.symbol !== symbol);
      setwatchlistData(updatedData);
      setFilteredData(updatedFiltered);
      setSearchData(updatedSearch);
      await axios.delete(`${BACKEND_URL}/dashboard/watchlist/remove/?symbol=${symbol}`);
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
      await fetchWatchlist();
    } catch (err) {
      console.error("Error adding stock to watchlist:", err.response?.data || err);
    }
  };
    const handleStockClick = (symbol) => {
      navigate(`/stockdetails/${symbol}`);
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
          }, 10000);
    
          return () => {
            clearInterval(intervalId);
          };
    },  [navigate, ensureAuth]);

  useEffect(() => {
    fetchWatchlist();
  }, []);

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
                  searchData.map((stock) => (
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
                        <span className="price-cell">{stock.price.toFixed(2)}</span>
                         <span className={`change-cell ${stock.change >= 0 ? 'change-positive' : 'change-negative'} change-cell-after`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td>
                        <span className={`change-cell ${stock.change >= 0 ? 'change-positive' : 'change-negative'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td>
                        <button 
                          className="action-btn"
                          aria-label={`Remove ${stock.symbol} from watchlist`} 
                           onClick={(e) => {e.stopPropagation(); handleRemoveStock(stock.symbol);}}
                        >
                         <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))
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
            { text: "Watchlist", href: "/watchlist" },
            { text: "Compare Stocks", href: "#" },
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

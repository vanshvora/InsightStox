import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';
import './MarketMovers.css';
import tata_icon from '../../assets/tata-icon.png';
import reliance_icon from '../../assets/reliance-icon.png';
import adani_icon from '../../assets/adani-icon.png';
import mahindra_icon from '../../assets/mahindra-icon.png';
import bajaj_icon from '../../assets/bajaj-icon.png';
import adityabirla_icon from '../../assets/adityabirla-icon.png';

// Always include credentials for auth sessions
axios.defaults.withCredentials = true;

// Centralized API base URL
const BASE_URL = import.meta.env.VITE_BACKEND_LINK;

// Specific endpoints
const MARKET_ACTIVE_API = `${BASE_URL}/dashboard/market/active/`;
const MARKET_GAINERS_API = `${BASE_URL}/dashboard/market/gainers/`;
const MARKET_LOSERS_API = `${BASE_URL}/dashboard/market/losers/`;

const StockListItem = ({ name,symbol, exchange, price, change, percentage, isGainer }) => {
  const changeColorClass = isGainer ? 'gainer' : 'loser';
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/StockDetails/${symbol}`);
  };

  return (
    <div className={`stock-item ${isGainer ? "gainer-row" : "loser-row"}`} onClick={handleClick}>
      <div className="stock-info">
        <p className="stock-name">{name}</p>
        <p className="stock-exchange">{exchange}</p>
      </div>
      <div className="stock-stats">
        <p className={`stock-price ${changeColorClass}`}>{price}</p>
        <div className={`stock-change ${changeColorClass}`}>
          <span>{isGainer ? '↑' : '↓'}</span> {change} ({percentage}%)
        </div>
      </div>
    </div>
  );
};

const BusinessGroupCard = ({ logo, name, stockCount }) => (
  <div className="group-card">
    <img src={logo} alt={`${name} logo`} className="group-logo" />
    <p className="group-name">{name}</p>
  </div>
);

export const MarketNewsItem = ({ headline, time, link }) => (
  <a 
    href={link} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="news-item clickable-news"
  >
    <p className="news-headline">{headline}</p>
    <p className="news-time">{time}</p>
  </a>
);
function timeAgo(isoTime) {
  const published = new Date(isoTime);
  const now = new Date();
  const diffMs = now - published;

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const MarketMovers = () => {
  const [marketNewsData, setMarketNewsData] = useState([]);
  const [gainersData, setGainersData] = useState([]);
  const [losersData, setLosersData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Fetch all data concurrently
        const [newsRes, gainersRes, losersRes] = await Promise.all([
          axios.get(MARKET_ACTIVE_API),
          axios.get(MARKET_GAINERS_API),
          axios.get(MARKET_LOSERS_API),
        ]);

        // Format NEWS
        if (Array.isArray(newsRes.data?.news)) {
          const formattedNews = newsRes.data.news.map((news) => ({
            headline: news.title,
            time: timeAgo(news.providerPublishTime),
            link: news.link,
          }));

          setMarketNewsData(formattedNews);
        }


        // Format GAINERS
        if (Array.isArray(gainersRes.data?.data)) {
          const formattedGainers = gainersRes.data.data.map((stock) => ({
            name: stock.shortName,
            symbol: stock.symbol,
            exchange: stock.exchange || 'NSE',
            price: stock.price,
            change: stock.change,
            percentage: stock.changePercent,
          }));
          setGainersData(formattedGainers);
        }

        // Format LOSERS
        if (Array.isArray(losersRes.data?.data)) {
          const formattedLosers = losersRes.data.data.map((stock) => ({
            name: stock.shortName,
            symbol: stock.symbol,
            exchange: stock.exchange || 'NSE',
            price: stock.price,
            change: stock.change,
            percentage: stock.changePercent,
          }));
          setLosersData(formattedLosers);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  // Static business group cards
  const businessGroupsData = [
    { logo: tata_icon, name: 'TATA'},
    { logo: reliance_icon, name: 'Reliance'},
    { logo: adani_icon, name: 'Adani'},
    { logo: mahindra_icon, name: 'Mahindra'},
    { logo: bajaj_icon, name: 'Bajaj'},
    { logo: adityabirla_icon, name: 'Aditya Birla'},
  ];

  if (loading) {
    return <div className="loading-container">Loading Market Data...</div>;
  }

  return (
    <div className="market-movers-container">
      <div className="header">
        <h2 className="header-title">Market Movers</h2>
        
      </div>

      <div className="framed-section">
  <div className="framed-grid">
    <div className="content-card">
      <h3 className="content-title gainer">Gainers</h3>
      {gainersData.map((stock, index) => (
        <StockListItem key={index} {...stock} isGainer />
      ))}
    </div>

    <div className="content-card">
      <h3 className="content-title loser">Losers</h3>
      {losersData.map((stock, index) => (
        <StockListItem key={index} {...stock} isGainer={false} />
      ))}
    </div>
  </div>
</div>


      <div className="main-grid">
        <div className="content-card">
          <h3 className="content-title">Top Business Groups</h3>
          <div className="groups-grid">
            {businessGroupsData.map((group, index) => (
              <BusinessGroupCard key={index} {...group} />
            ))}
          </div>
          
        </div>

        <div className="content-card">
          <h3 className="content-title">Market News</h3>
          {marketNewsData.map((news, index) => (
            <MarketNewsItem key={index} {...news} />
          ))}
          
        </div>
      </div>
    </div>
  );
};

export default MarketMovers;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './MarketMovers.css';
import tata_icon from '../../assets/tata-icon.png';
import reliance_icon from '../../assets/reliance-icon.png';
import adani_icon from '../../assets/adani-icon.png';
import mahindra_icon from '../../assets/mahindra-icon.png';
import bajaj_icon from '../../assets/bajaj-icon.png';
import adityabirla_icon from '../../assets/adityabirla-icon.png';

axios.defaults.withCredentials = true;

const BASE_URL = import.meta.env.VITE_BACKEND_LINK;

const MARKET_ACTIVE_API = `${BASE_URL}/dashboard/market/active/`;
const MARKET_GAINERS_API = `${BASE_URL}/dashboard/market/gainers/`;
const MARKET_LOSERS_API = `${BASE_URL}/dashboard/market/losers/`;

const formatPrice = (price) => {
  const n = parseFloat(price);
  return Number.isFinite(n) ? n.toFixed(2) : 'N/A';
};

const formatChange = (change) => {
  const n = parseFloat(change);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const StockListItem = ({ name, symbol, exchange, price, change, percentage, isGainer }) => {
  const changeColorClass = isGainer ? 'gainer' : 'loser';
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/stockdetails/${symbol}`);
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

const BusinessGroupCard = ({ logo, name }) => (
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

function timeAgo(timestamp) {
  if (!timestamp) return "Unknown time";

  const ms = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
  const published = new Date(ms);
  if (isNaN(published.getTime())) return "Unknown time";

  const now = new Date();
  const diffMs = now - published;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function mapMover(stock) {
  return {
    name: stock.shortName || stock.name || stock.symbol || 'N/A',
    symbol: stock.symbol,
    exchange: stock.exchange || 'NSE',
    price: formatPrice(stock.price),
    change: formatChange(stock.change),
    percentage: formatChange(stock.changePercent),
  };
}

const MarketMovers = () => {
  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['marketMovers'],
    queryFn: async () => {
      const [newsRes, gainersRes, losersRes] = await Promise.allSettled([
        axios.get(MARKET_ACTIVE_API),
        axios.get(MARKET_GAINERS_API),
        axios.get(MARKET_LOSERS_API),
      ]);

      let formattedNews = [];
      if (newsRes.status === 'fulfilled' && Array.isArray(newsRes.value.data?.news)) {
        formattedNews = newsRes.value.data.news.map((news) => {
          const content = news.content || news;
          const link =
            content.clickThroughUrl?.url ||
            content.clickThroughUrl ||
            content.link ||
            content.url ||
            "#";

          return {
            headline: content.title || content.headline || "Market Update",
            time: timeAgo(
              content.providerPublishTime || content.pubDate || content.publishedAt
            ),
            link: typeof link === 'string' ? link : link?.url || "#",
          };
        });
      }

      const formattedGainers =
        gainersRes.status === 'fulfilled' && Array.isArray(gainersRes.value.data?.data)
          ? gainersRes.value.data.data.map(mapMover)
          : [];

      const formattedLosers =
        losersRes.status === 'fulfilled' && Array.isArray(losersRes.value.data?.data)
          ? losersRes.value.data.data.map(mapMover)
          : [];

      return {
        news: formattedNews.slice(0, 5),
        gainers: formattedGainers.slice(0, 3),
        losers: formattedLosers.slice(0, 3),
      };
    },
    retry: 1,
    staleTime: 60 * 1000,
  });

  const marketNewsData = data?.news || [];
  const gainersData = data?.gainers || [];
  const losersData = data?.losers || [];

  const businessGroupsData = [
    { logo: tata_icon, name: 'TATA' },
    { logo: reliance_icon, name: 'Reliance' },
    { logo: adani_icon, name: 'Adani' },
    { logo: mahindra_icon, name: 'Mahindra' },
    { logo: bajaj_icon, name: 'Bajaj' },
    { logo: adityabirla_icon, name: 'Aditya Birla' },
  ];

  if (loading) {
    return (
      <div className="market-movers-container">
        <div className="header">
          <h2 className="header-title">Market Movers</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading Market Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-movers-container">
      <div className="header">
        <h2 className="header-title">Market Movers</h2>
      </div>

      {isError && (
        <p className="market-movers-error">Could not refresh some market data.</p>
      )}

      <div className="framed-section">
        <div className="framed-grid">
          <div className="content-card">
            <h3 className="content-title gainer">Gainers</h3>
            {gainersData.length > 0 ? (
              gainersData.map((stock, index) => (
                <StockListItem key={index} {...stock} isGainer />
              ))
            ) : (
              <p className="empty-state">No gainers available.</p>
            )}
          </div>

          <div className="content-card">
            <h3 className="content-title loser">Losers</h3>
            {losersData.length > 0 ? (
              losersData.map((stock, index) => (
                <StockListItem key={index} {...stock} isGainer={false} />
              ))
            ) : (
              <p className="empty-state">No losers available.</p>
            )}
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
          {marketNewsData.length > 0 ? (
            marketNewsData.map((news, index) => (
              <MarketNewsItem key={index} {...news} />
            ))
          ) : (
            <p className="empty-state">No market news available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketMovers;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './WelcomeInvestor.css';
import evaluation_icon from '../../assets/evaluation-icon.png';
import totalvalue_icon from '../../assets/totalvalue-icon.png';
import gain_icon from '../../assets/gain-icon.png';
import overallgraph_icon from '../../assets/overallgraph-icon.png';

axios.defaults.withCredentials = true;

//Centralized backend URLs
const BASE_URL = import.meta.env.VITE_BACKEND_LINK;
const API_URL = `${BASE_URL}/api/v1/dashboard/Valuation`;
const STOCKS_API = `${BASE_URL}/dashboard/market/active/`;
const USER_API = `${BASE_URL}/users/profile/`;

const stockmapping = (stockData) => ({
  name: stockData.shortName,
  symbol: stockData.symbol,
  nse: stockData.exchange,
  price: stockData.price,
  change: stockData.change,
  changePercent: stockData.changePercent,
  isUp: parseFloat(stockData.changePercent) >= 0,
});

const PortfolioCard = ({ icon, title, value, details, valueColor }) => (
  <div className="portfolio-card">
    <img src={icon} alt={title} className="card-icon" />
    <p className="card-title">{title}</p>
    <p className={`card-value ${valueColor}`}>{value}</p>
    {details && <p className={`card-details ${valueColor}`}>{details}</p>}
  </div>
);

const TrendingStocks = () => {
  const [stocksData, setStocksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleOpenDetails = (symbol) => {
    navigate(`/stockdetails/${symbol}`);
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchTrendingStocks() {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(STOCKS_API);
        if (!cancelled) {
          const formatted = res.data.data?.map(stockmapping) || [];
          setStocksData(formatted);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching trending stocks:', err);
          setError('Failed to load trending stocks from backend.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTrendingStocks();
    const interval = setInterval(fetchTrendingStocks, 900000); // auto-refresh every 15min

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="trending-stocks-container">
      <h3 className="trending-title">Trending Stocks</h3>

      {loading && <p>Loading trending stocks…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="stocks-list">
          {stocksData.map((stock, index) => (
            <div key={index} className="trending-stock-item" onClick={() => handleOpenDetails(stock.symbol)}>
              <div className="stock-info flex flex-col">
                <p className="stock-name">{stock.name}</p>
                <p className="stock-nse">{stock.nse}</p>
              </div>
              <div className="stock-details">
                <p className={`stock-price ${stock.isUp ? 'text-positive' : 'text-negative'}`}>
                  ₹{stock.price} {stock.isUp ? '↑' : '↓'}
                </p>
                <p className={`stock-change ${stock.isUp ? 'text-positive' : 'text-negative'}`}>
                  {stock.change} ({stock.changePercent}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
const WelcomeInvestor = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchValuation() {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(API_URL);
        if (!cancelled) setData(res.data);
      } catch (err) {
        const backendMsg = err.response?.data?.message;
        if (backendMsg === 'No stock summary found for the user.') {
          if (!cancelled) {
            setData({
              totalValuation: 0,
              todayProfitLoss: 0,
              todayProfitLosspercentage: 0,
              overallProfitLoss: 0,
              overallProfitLosspercentage: 0,
            });
          }
        } else {
          let errorMsg = 'Failed to load data.';
          if (err.response?.status === 401) {
            errorMsg = 'Session expired. Please login again.';
          } 
          else {
            errorMsg = err.message;
          }
          if (!cancelled) setError(errorMsg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function fetchUser() {
      try {
        const res = await axios.get(USER_API);
        if (!cancelled) {
          const fullName = res.data.data.name || '';
          const firstName = fullName.split(' ')[0];
          setUserName(firstName);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }

    fetchValuation();
    fetchUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (amount) =>
    !amount || isNaN(amount)
      ? '₹0.00'
      : `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const formatPercentage = (percent) =>
    !percent || isNaN(percent) ? '0.00%' : `${parseFloat(percent).toFixed(2)}%`;

  const cardData = [
    {
      icon: totalvalue_icon,
      title: 'Total Portfolio Value',
      value: loading ? '₹---' : formatCurrency(data?.totalValuation),
    },
    {
      icon: gain_icon,
      title: "Today's Gain/Loss",
      value: loading ? '---' : formatCurrency(data?.todayProfitLoss),
      details: loading ? '---' : `(${formatPercentage(data?.todayProfitLosspercentage)})`,
      valueColor: loading
        ? ''
        : parseFloat(data?.todayProfitLoss) < 0
        ? 'text-negative'
        : 'text-positive',
    },
    {
      icon: overallgraph_icon,
      title: 'Overall Gain/Loss',
      value: loading ? '---' : formatCurrency(data?.overallProfitLoss),
      details: loading ? '---' : `(${formatPercentage(data?.overallProfitLosspercentage)})`,
      valueColor: loading
        ? ''
        : parseFloat(data?.overallProfitLoss) < 0
        ? 'text-negative'
        : 'text-positive',
    },
    {
      icon: evaluation_icon,
      title: 'Portfolio Risk',
      value: loading
        ? '---'
        : parseFloat(data?.overallProfitLosspercentage) <= 0
        ? 'High'
        : parseFloat(data?.overallProfitLosspercentage) < 5
        ? 'Moderate'
        : 'Low',
      valueColor: loading
        ? ''
        : parseFloat(data?.overallProfitLosspercentage) <= 0
        ? 'text-negative'
        : parseFloat(data?.overallProfitLosspercentage) < 5
        ? 'text-neutral'
        : 'text-positive',
    },
  ];

  return (
    <div className="page-container">
      <div className="dashboard-wrapper">
        <div className="main-content">
          <div className="welcome-header">
            <h1>
              Welcome back, <strong>{userName || 'Investor'}!</strong>
            </h1>
            <p>Here's your portfolio overview for today.</p>
          </div>

          {loading && <p>Loading portfolio valuation…</p>}
          {error && <p className="error">Error loading valuation: {error}</p>}

          <div className="portfolio-grid">
            {cardData.map((card, index) => (
              <PortfolioCard key={index} {...card} />
            ))}
          </div>
        </div>
        <aside className="sidebar">
          <TrendingStocks />
        </aside>
      </div>
    </div>
  );
};

export default WelcomeInvestor;

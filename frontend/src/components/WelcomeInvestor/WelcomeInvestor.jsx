import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './WelcomeInvestor.css';
import evaluation_icon from '../../assets/evaluation-icon.png';
import totalvalue_icon from '../../assets/totalvalue-icon.png';
import gain_icon from '../../assets/gain-icon.png';
import overallgraph_icon from '../../assets/overallgraph-icon.png';
import { getPortfolioRiskFromCaps } from '../../utils/dataCleaningFuncs.jsx';

axios.defaults.withCredentials = true;

//Centralized backend URLs
const BASE_URL = import.meta.env.VITE_BACKEND_LINK;
const API_URL = `${BASE_URL}/dashboard/valuation/`;
const STOCKS_API = `${BASE_URL}/dashboard/market/active/`;
const USER_API = `${BASE_URL}/users/profile/`;
const PORTFOLIO_SUMMARY_API = `${BASE_URL}/portfolio/summary/`;

const stockmapping = (stockData) => ({
  name: ((stockData.name && stockData.name !== 'N/A' ? stockData.name : null) || 
        (stockData.shortName && stockData.shortName !== 'N/A' ? stockData.shortName : null) || 
        (stockData.longName && stockData.longName !== 'N/A' ? stockData.longName : null) || 
        stockData.symbol).replace(/\.NS$/, ''),
  symbol: stockData.symbol,
  nse: stockData.exchange,
  price: stockData.price || stockData.currentPrice,
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
  const { data: stocksData = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['trendingStocks'],
    queryFn: async () => {
      const res = await axios.get(STOCKS_API);
      return res.data.data?.map(stockmapping) || [];
    },
    refetchInterval: 120000
  });

  const error = queryError ? 'Failed to load trending stocks from backend.' : null;
  const navigate = useNavigate();

  const handleOpenDetails = (symbol) => {
    navigate(`/stockdetails/${symbol}`);
  };

  return (
    <div className="trending-stocks-container">
      <h3 className="trending-title">Trending Stocks</h3>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="stocks-list">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="trending-stock-item">
              <div className="stock-info flex flex-col">
                <div className="skeleton" style={{ width: '80px', height: '20px', marginBottom: '8px' }}></div>
                <div className="skeleton" style={{ width: '40px', height: '14px' }}></div>
              </div>
              <div className="stock-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div className="skeleton" style={{ width: '60px', height: '20px', marginBottom: '8px' }}></div>
                <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}

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
  const { data = null, isLoading: loading, error: valuationError } = useQuery({
    queryKey: ['dashboardValuation'],
    queryFn: async () => {
      const res = await axios.get(API_URL);
      return res.data.data;
    },
    retry: false
  });

  const { data: userName = '' } = useQuery({
    queryKey: ['userName'],
    queryFn: async () => {
      const res = await axios.get(USER_API);
      const fullName = res.data.data.name || '';
      return fullName.split(' ')[0];
    }
  });

  const { data: portfolioSummary = [], isLoading: riskLoading } = useQuery({
    queryKey: ['portfolioSummary'],
    queryFn: async () => {
      const res = await axios.get(PORTFOLIO_SUMMARY_API);
      return res.data.summary || [];
    },
    retry: false
  });

  const error = valuationError ? (valuationError.response?.status === 401 ? 'Session expired. Please login again.' : 'Failed to load data.') : null;
  const portfolioRisk = getPortfolioRiskFromCaps(portfolioSummary);

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
      value: loading || riskLoading
        ? '---'
        : portfolioRisk,
      valueColor: loading || riskLoading
        ? ''
        : portfolioRisk === 'Aggressive'
        ? 'text-negative'
        : portfolioRisk === 'Moderate'
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

          {error && <p className="error">Error loading valuation: {error}</p>}

          {loading && (
            <div className="portfolio-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="portfolio-card">
                  <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px', marginBottom: '16px' }}></div>
                  <div className="skeleton" style={{ width: '120px', height: '16px', marginBottom: '12px' }}></div>
                  <div className="skeleton" style={{ width: '100px', height: '28px', marginBottom: '8px' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '14px' }}></div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && (
            <div className="portfolio-grid">
              {cardData.map((card, index) => (
                <PortfolioCard key={index} {...card} />
              ))}
            </div>
          )}
        </div>
        <aside className="sidebar">
          <TrendingStocks />
        </aside>
      </div>
    </div>
  );
};

export default WelcomeInvestor;

import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

axios.defaults.withCredentials = true;

const BASE_URL = import.meta.env.VITE_BACKEND_LINK;

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const ms = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
  const published = new Date(ms);
  if (isNaN(published.getTime())) return "Just now";
  const diffMins = Math.floor((new Date() - published) / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : 'N/A';
};

const DataPrefetcher = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`${BASE_URL}/dashboard/bootstrap/`);
        if (cancelled || !res.data?.success) return;
        const d = res.data.data;

        queryClient.setQueryData(['dashboardHeaderStocks'], (d.starter || []).slice(0, 3));
        queryClient.setQueryData(['dashboardValuation'], d.valuation);
        queryClient.setQueryData(['portfolioSummary'], d.summary || []);
        queryClient.setQueryData(['portfolioHoldings'], d.holdings || []);
        queryClient.setQueryData(['allocation'], d.allocation || { labels: [], values: [] });

        queryClient.setQueryData(['watchlist'], (d.watchlist || []).map((item) => ({
          company: item.name || item.shortName,
          symbol: item.symbol,
          price: item.price || item.currentPrice,
          change: item.change || item.currentchange,
          changePercent: item.changePercent || item.percentageChange,
          sector: item.sector || 'N/A',
          marketcap: item.marketCap || item.marketcap
        })));

        const mapMover = (stock) => ({
          name: (stock.shortName || stock.name || stock.symbol || 'N/A').replace(/\.NS$/, ''),
          symbol: stock.symbol,
          exchange: stock.exchange || 'NSE',
          price: num(stock.price),
          change: num(stock.change) === 'N/A' ? '0.00' : num(stock.change),
          percentage: num(stock.changePercent) === 'N/A' ? '0.00' : num(stock.changePercent),
        });
        const market = d.market || {};
        queryClient.setQueryData(['marketMovers'], {
          news: (market.news || []).map((n) => {
            const content = n.content || n;
            const link = content.clickThroughUrl?.url || content.clickThroughUrl || content.link || content.url || "#";
            return {
              headline: content.title || content.headline || "Market Update",
              time: timeAgo(content.providerPublishTime || content.pubDate || content.publishedAt),
              link: typeof link === 'string' ? link : link?.url || "#",
            };
          }).slice(0, 5),
          gainers: (market.gainers || []).map(mapMover).slice(0, 3),
          losers: (market.losers || []).map(mapMover).slice(0, 3),
        });

        queryClient.setQueryData(['trendingStocks'], (market.active || []).map((s) => ({
          name: ((s.name && s.name !== 'N/A' ? s.name : null) ||
            (s.shortName && s.shortName !== 'N/A' ? s.shortName : null) ||
            (s.longName && s.longName !== 'N/A' ? s.longName : null) ||
            s.symbol).replace(/\.NS$/, ''),
          symbol: s.symbol,
          nse: s.exchange,
          price: s.price || s.currentPrice,
          change: s.change,
          changePercent: s.changePercent,
          isUp: parseFloat(s.changePercent) >= 0,
        })).slice(0, 6));
      } catch {
        return;
      }
    })();

    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['portfolioChartData'],
        queryFn: async () => {
          const response = await axios.get(`${BASE_URL}/dashboard/portfolio-valuation/`, {
            params: { timePeriod: "1Y" },
          });
          const { data } = response.data || {};
          if (!data?.daily) throw new Error("Backend data missing.");
          return data.daily.map((d) => ({
            date: d.date,
            valuation: Number(d.valuation) || 0,
          }));
        }
      });
    }, 2500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [queryClient]);

  return null;
};

export default DataPrefetcher;

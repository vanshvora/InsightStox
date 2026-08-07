import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

axios.defaults.withCredentials = true;

const BASE_URL = import.meta.env.VITE_BACKEND_LINK;

const DataPrefetcher = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Prefetch Watchlist
    queryClient.prefetchQuery({
      queryKey: ['watchlist'],
      queryFn: async () => {
        const res = await axios.get(`${BASE_URL}/dashboard/watchlist/`);
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

    // 2. Prefetch Portfolio Valuation
    queryClient.prefetchQuery({
      queryKey: ['dashboardValuation'],
      queryFn: async () => {
        const res = await axios.get(`${BASE_URL}/dashboard/valuation/`);
        return res.data.data;
      }
    });

    // 3. Prefetch Portfolio Summary
    queryClient.prefetchQuery({
      queryKey: ['portfolioSummary'],
      queryFn: async () => {
        const res = await axios.get(`${BASE_URL}/portfolio/summary/`);
        return res.data.summary || [];
      }
    });

    // 4. Prefetch Portfolio Chart Data (1Y by default)
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

    // 5. Prefetch Portfolio Holdings
    queryClient.prefetchQuery({
      queryKey: ['portfolioHoldings'],
      queryFn: async () => {
        const res = await axios.get(`${BASE_URL}/portfolio/holdings/`);
        return res.data?.data || [];
      }
    });

    // 6. Prefetch Dashboard Header Stocks
    queryClient.prefetchQuery({
      queryKey: ['dashboardHeaderStocks'],
      queryFn: async () => {
        const res = await axios.get(`${BASE_URL}/dashboard/starter/`);
        if (res.data?.data && Array.isArray(res.data.data)) {
          return res.data.data.slice(0, 3);
        }
        return [];
      }
    });

    // 7. Prefetch Market Movers
    queryClient.prefetchQuery({
      queryKey: ['marketMovers'],
      queryFn: async () => {
        const [newsRes, gainersRes, losersRes] = await Promise.allSettled([
          axios.get(`${BASE_URL}/dashboard/market/active/`),
          axios.get(`${BASE_URL}/dashboard/market/gainers/`),
          axios.get(`${BASE_URL}/dashboard/market/losers/`),
        ]);
        
        let formattedNews = [];
        if (newsRes.status === 'fulfilled' && Array.isArray(newsRes.value.data?.news)) {
          formattedNews = newsRes.value.data.news.map((news) => {
            const content = news.content || news;
            const link = content.clickThroughUrl?.url || content.clickThroughUrl || content.link || content.url || "#";
            return {
              headline: content.title || content.headline || "Market Update",
              time: "Just now", // Simplified for prefetch
              link: typeof link === 'string' ? link : link?.url || "#",
            };
          }).slice(0, 5);
        }

        const mapMover = (stock) => ({
          name: stock.shortName || stock.name || stock.symbol || 'N/A',
          symbol: stock.symbol,
          exchange: stock.exchange || 'NSE',
          price: stock.price,
          change: stock.change,
          percentage: stock.changePercent,
        });

        const gainers = gainersRes.status === 'fulfilled' && Array.isArray(gainersRes.value.data?.data)
            ? gainersRes.value.data.data.map(mapMover).slice(0, 3) : [];
        const losers = losersRes.status === 'fulfilled' && Array.isArray(losersRes.value.data?.data)
            ? losersRes.value.data.data.map(mapMover).slice(0, 3) : [];

        return { news: formattedNews, gainers, losers };
      }
    });

  }, [queryClient]);

  // This component doesn't render anything visible
  return null;
};

export default DataPrefetcher;

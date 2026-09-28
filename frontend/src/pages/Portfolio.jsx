import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import DashboardHeader from '../components/Dashboard-Header.jsx';
import PortfolioChart from '../components/PortfolioChart/PortfolioChart'
import Footer from '../components/Footer.jsx';
import { useAppContext } from "../context/AppContext.jsx";
import { getPortfolioRiskFromCaps, formatDate, formatLargeNumber, formatPercentage, roundTo } from "../utils/dataCleaningFuncs.jsx";
import { PortfolioSummary } from "../components/PortfolioSummary";
import { PortfolioHoldings } from "../components/PortfolioHoldings";
import { PortfolioFundamentals } from "../components/PortfolioFundamentals";
import './Portfolio.css';
import { useNavigate } from "react-router-dom";
export const Portfolio = () => {
    const BASE_URL = import.meta.env.VITE_BACKEND_LINK;
    axios.defaults.withCredentials = true;
    const { userDetails, setIsSearchActive, ensureAuth } = useAppContext();
    const [darkMode, setDarkMode] = useState(true);
    const [selectedMode, setSelectedMode] = useState("holdings");

    const handleMode = (mode) => {
        setSelectedMode(mode);
    }

    const navigate = useNavigate();
    
    useEffect(() => {
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
    }, [navigate, ensureAuth]);
    const { data: userPortfolio = {}, isLoading: isValuationLoading } = useQuery({
        queryKey: ['portfolioValuation'],
        queryFn: async () => {
            const res = await axios.get(`${BASE_URL}/dashboard/valuation/`, { withCredentials: true });
            return res.data.data || {};
        }
    });

    const { data: portfolioSummaryRaw = [], isLoading: isSummaryLoading } = useQuery({
        queryKey: ['portfolioSummary'],
        queryFn: async () => {
            const res = await axios.get(`${BASE_URL}/portfolio/summary/`, { withCredentials: true });
            return res.data.summary || [];
        }
    });

    const portfolioRisk = getPortfolioRiskFromCaps(portfolioSummaryRaw);
    const portfolioSummary = useMemo(
        () =>
            portfolioSummaryRaw.map(item => ({
                ...item,
                marketCap: formatLargeNumber(item.marketCap),
                lastPrice: roundTo(item.lastPrice, 2),
                change: roundTo(item.change, 2),
                changePercent: formatPercentage(item.changePercent),
                marketTime: item.marketTime,
                totalValue: formatLargeNumber(item.totalValue),
                profitLoss: formatLargeNumber(item.profitLoss),
                profitLossPercentage: formatPercentage(item.profitLossPercentage),
                allocationPercentage: formatPercentage(item.allocationPercentage),
            })),
        [portfolioSummaryRaw]
    );

    const { data: portfolioHoldings = [] } = useQuery({
        queryKey: ['portfolioHoldings'],
        queryFn: async () => {
            const res = await axios.get(`${BASE_URL}/portfolio/holdings/`, { withCredentials: true });
            return res.data.data || [];
        }
    });

    const { data: portfolioFundamentals = [] } = useQuery({
        queryKey: ['portfolioFundamentals'],
        queryFn: async () => {
            const res = await axios.get(`${BASE_URL}/portfolio/fundamentals/`, { withCredentials: true });
            const data = res.data.data;
            if (data) {
                return data.map(item => ({
                    ...item,
                    marketCap: formatLargeNumber(item.marketCap) ?? "--",
                    epsEstimateNextYear: roundTo(item.epsEstimateNextYear, 2) ?? "--",
                    forwardPE: roundTo(item.forwardPE, 2) ?? "--",
                    divPaymentDate: formatDate(item.divPaymentDate) ?? "--",
                    exDivDate: formatDate(item.exDivDate) ?? "--",
                    dividendPerShare: roundTo(item.dividendPerShare, 2) ?? "--",
                    forwardAnnualDivRate: roundTo(item.forwardAnnualDivRate, 2) ?? "--",
                    forwardAnnualDivYield: item.forwardAnnualDivYield ?? "--",
                    trailingAnnualDivRate: roundTo(item.trailingAnnualDivRate, 2) ?? "--",
                    trailingAnnualDivYield: item.trailingAnnualDivYield ?? "--",
                    priceToBook: roundTo(item.priceToBook, 2) ?? "--",
                    currentHolding: formatLargeNumber(item.currentHolding) ?? "--",
                }));
            }
            return [];
        }
    });

    return (
        <div className="portfolio-main-page">
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} pageType="portfolio" 
            profileData={{name: userDetails?.name?.split(" ")[0] || "Guest",email: userDetails?.email || "N/A"}}/>
            
            <DashboardHeader />
            <div className="portfolio-empty"></div>
            <div className="portfolio-maincontent">
                <div className="portfolio-values">
                    <div className="first-div">
                        <div className="total-val-cur">
                            <div className="label-cur">Total Current Value</div>
                            {isValuationLoading ? (
                                <div className="skeleton" style={{ width: '180px', height: '40px', marginTop: '8px', borderRadius: '8px' }}></div>
                            ) : (
                                <div className="amount-cur">₹{userPortfolio.totalValuation}</div>
                            )}
                        </div>
                        <div className="total-val-inv">
                            <div className="label-inv">Total Invested Value</div>
                            {isValuationLoading ? (
                                <div className="skeleton" style={{ width: '180px', height: '40px', marginTop: '8px', borderRadius: '8px' }}></div>
                            ) : (
                                <div className="amount-inv">₹{userPortfolio.totalInvestment}</div>
                            )}
                        </div>
                    </div>
                    <div className="second-div">
                        <div className="today-gl">
                            <div className="today-gl-label">Today's Gain/Loss</div>
                            {isValuationLoading ? (
                                <div className="skeleton" style={{ width: '160px', height: '28px', marginTop: '8px', borderRadius: '6px' }}></div>
                            ) : (
                                <div className={`today-gl-amount ${userPortfolio.todayProfitLoss > 0 ? "profit" : 
                                                                    userPortfolio.todayProfitLoss < 0 ? "loss" : ""}`} data-testid="today-gl-amount">
                                    ₹{userPortfolio.todayProfitLoss} ({userPortfolio.todayProfitLosspercentage > 0 ? "+" : ""}{`${userPortfolio.todayProfitLosspercentage}%`})
                                </div>
                            )}
                        </div>
                        <div className="overall-gl">
                            <div className="overall-gl-label">Overall Gain/Loss</div>
                            {isValuationLoading ? (
                                <div className="skeleton" style={{ width: '160px', height: '28px', marginTop: '8px', borderRadius: '6px' }}></div>
                            ) : (
                                <div className={`overall-gl-amount ${userPortfolio.overallProfitLoss > 0 ? "profit" :
                                                                        userPortfolio.overallProfitLoss < 0 ? "loss" : ""}`} data-testid="overall-gl-amount">
                                    ₹{userPortfolio.overallProfitLoss} ({userPortfolio.overallProfitLosspercentage > 0 ? "+" : ""}{`${userPortfolio.overallProfitLosspercentage}%`})
                                </div>
                            )}
                        </div>
                        <div className="risk">
                            <div className="risk-label">Portfolio Risk</div>
                            {isSummaryLoading ? (
                                <div className="skeleton" style={{ width: '120px', height: '28px', marginTop: '8px', borderRadius: '6px' }}></div>
                            ) : (
                                <div className={`risk-amount ${portfolioRisk === "Conservative" ? "low" 
                                                                : portfolioRisk === "Moderate" ? "med"
                                                                : portfolioRisk === "Aggressive" ? "high" : ""}`}>{portfolioRisk}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="portfolio-chart">
                    <PortfolioChart />
                </div>

                <div className="portfolio-mode-btns">
                    <div className="portfolio-toggle-div">
                        <button className={`portfolio-btn ${selectedMode === "holdings" ? "active" : ""}`} onClick={() => handleMode("holdings")}>Holdings</button>
                        <button className={`portfolio-btn ${selectedMode === "summary" ? "active" : ""}`} onClick={() => handleMode("summary")}>Summary</button>
                        <button className={`portfolio-btn ${selectedMode === "fundamentals" ? "active" : ""}`} onClick={() => handleMode("fundamentals")}>Fundamentals</button>
                    </div>

                    <div className="portfolio-add-stk">
                        <button className="portfolio-add-stk-btn" onClick={() => setIsSearchActive(true)}>Add Stock</button>
                    </div>
                </div>

                <div className="portfolio-stocks-list">
                    {selectedMode === "holdings" ?
                        <PortfolioHoldings portfolioHoldings={portfolioHoldings} />
                        : selectedMode === "fundamentals" ?
                            <PortfolioFundamentals portfolioFundamentals={portfolioFundamentals} />
                            : <PortfolioSummary portfolioSummary={portfolioSummary} />
                    }
                </div>
                <Footer
                    darkMode={darkMode}
                    navigationLinks={[
                        { text: "Portfolio", href: "/portfolio" },
                        { text: "AI Insigths", href: "/ai-insight" },
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
    );
};

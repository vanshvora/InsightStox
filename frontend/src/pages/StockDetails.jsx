import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import DashboardHeader from '../components/Dashboard-Header.jsx';
import Footer from '../components/Footer.jsx';
import { FieldValue } from "../components/FieldValue.jsx";
import { MarketNewsItem } from "../components/MarketMovers/MarketMovers.jsx";
import StockAction from "../components/StockAction";
import StockChart from "../components/StockChart";
import './StockDetails.css';
import { useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { useNavigate } from "react-router-dom";
import { formatDate, formatLargeNumber, formatPercentage, formatSmallNumber, roundTo } from "../utils/dataCleaningFuncs.jsx";

export const StockDetails = () => {
    const BASE_URL = import.meta.env.VITE_BACKEND_LINK;
    const [darkMode, setDarkMode] = useState(true);
    const { userDetails, ensureAuth } = useAppContext();
    const [buyStock, handleBuyStock] = useState("");
    const [sellStock, handleSellStock] = useState("");
    const [addedStock, handleAdd] = useState("");
    const { symbol } = useParams();
    const [stockData, setStockData] = useState({
        priceInfo: {},
        fundamentals: {},
        financials: {},
        balenceSheet: {},
        profitability: {},
        cashFlow: {},
        fiscalInformation: {},
        Company: {},
    });
    const navigate = useNavigate();
    const [newsData, setMarketData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalAction, setModalAction] = useState("");
    axios.defaults.withCredentials = true;

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
    }, [navigate, ensureAuth]);

    const openAddModel = () => {
        if (!stockData?.priceInfo?.currentPrice || stockData.priceInfo.currentPrice === "--") {
            return;
        }
        setModalAction("BUY");
        setShowModal(true);
    };

    const openRmvModel = () => {
        if (!stockData?.priceInfo?.currentPrice || stockData.priceInfo.currentPrice === "--") {
            return;
        }
        setModalAction("SELL");
        setShowModal(true);
    };

    const closeModel = () => {
        setShowModal(false);
    }

    useEffect(() => {
        const getStockDetails = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/dashboard/stock-details/?ticker=${symbol}`,
                    { withCredentials: true });

                const raw = res?.data.data || res.data;

                setStockData({
                    priceInfo: {
                        currentPrice: roundTo(raw.priceInfo?.currentPrice),
                        previousClose: roundTo(raw.priceInfo?.previousClose),
                        open: roundTo(raw.priceInfo?.open),
                        dayHigh: roundTo(raw.priceInfo?.dayHigh),
                        dayLow: roundTo(raw.priceInfo?.dayLow),
                        volume: formatLargeNumber(raw.priceInfo?.volume),
                        fiftytwoWeekHigh: roundTo(raw.priceInfo?.fiftytwoWeekHigh),
                        fiftyTwoWeekLow: roundTo(raw.priceInfo?.fiftyTwoWeekLow),
                        marketCap: formatLargeNumber(raw.priceInfo?.marketCap),
                        change: roundTo(raw.priceInfo?.change),
                        changePercentage: formatPercentage(raw.priceInfo?.changePercentage),
                    },
                    fundamentals: {
                        roceTTM: formatPercentage(raw.fundamentals?.roceTTM),
                        peRatioTTM: formatSmallNumber(raw.fundamentals?.peRatioTTM),
                        pbRatio: formatSmallNumber(raw.fundamentals?.pbRatio),
                        industryPE: formatSmallNumber(raw.fundamentals?.industryPE),
                        debtToEquity: formatSmallNumber(raw.fundamentals?.debtToEquity),
                        roeTTM: formatPercentage(raw.fundamentals?.roeTTM),
                        epsTTM: formatSmallNumber(raw.fundamentals?.epsTTM),
                        dividendYield: formatPercentage(raw.fundamentals?.dividendYield),
                        bookValue: formatSmallNumber(raw.fundamentals?.bookValue),
                        faceValue: formatSmallNumber(raw.fundamentals?.faceValue),
                    },
                    financials: {
                        revenueTTM: formatLargeNumber(raw.financials?.revenueTTM),
                        revenuePerShare: formatSmallNumber(raw.financials?.revenuePerShare),
                        earningGrowthQuater: formatPercentage(raw.financials?.earningGrowthQuater),
                        grossProfitTTM: formatLargeNumber(raw.financials?.grossProfitTTM),
                        ebitda: formatLargeNumber(raw.financials?.ebitda),
                        netIncome: formatLargeNumber(raw.financials?.netIncome),
                        dilutedEPS: formatSmallNumber(raw.financials?.dilutedEPS),
                    },
                    balenceSheet: {
                        totalCash: formatLargeNumber(raw.balenceSheet?.totalCash),
                        totalCashPerShare: formatSmallNumber(raw.balenceSheet?.totalCashPerShare),
                        totalDebt: formatLargeNumber(raw.balenceSheet?.totalDebt),
                        deptToEquity: formatSmallNumber(raw.balenceSheet?.deptToEquity),
                        currentRatioMRQ: formatSmallNumber(raw.balenceSheet?.currentRatioMRQ),
                        bookValuePerShare: formatSmallNumber(raw.balenceSheet?.bookValuePerShare),
                    },
                    profitability: {
                        profitMargin: formatPercentage(raw.profitability?.profitMargin),
                        operatingMargin: formatPercentage(raw.profitability?.operatingMargin),
                        returnOnAssets: formatPercentage(raw.profitability?.returnOnAssets),
                        returnOnEquity: formatPercentage(raw.profitability?.returnOnEquity),
                    },
                    cashFlow: {
                        operatingCashFlow: formatLargeNumber(raw.cashFlow?.operatingCashFlow),
                        freeCashFlow: formatLargeNumber(raw.cashFlow?.freeCashFlow),
                    },
                    fiscalInformation: {
                        fiscalYearEnd: formatDate(raw.fiscalInformation?.fiscalYearEnd),
                        MRQ: formatDate(raw.fiscalInformation?.MRQ),
                    },
                    Company: {
                        longname: raw.Company?.longname || "--",
                        shortname: raw.Company?.shortname || "--",
                        fulltimeemployees: raw.Company?.fulltimeemployees || "--",
                        sector: raw.Company?.sector || "--",
                        industry: raw.Company?.industry || "--",
                        longdescription: raw.Company?.longdescription || "--",
                        website: raw.Company?.website || "--",
                    },
                });

            }
            catch (error) {
                console.error("Error fetching stock details:", error);
            }

        };
        getStockDetails();
    }, [symbol]);

    const handleWatchlist = async () => {
        try {
            await axios.post(`${BASE_URL}/dashboard/watchlist/add/`, { symbol: symbol }, { withCredentials: true });
            Swal.fire({
                toast: true,
                position: "top",
                icon: "success",
                title: `${symbol} added to watchlist successfully!`,
                iconColor: "#33ff57",
                background: "#1a1a1a",
                showConfirmButton: false,
                timer: 3000,
                customClass: {
                    popup: "small-toast"
                }
            });
        }
        catch (error) {
            console.error("Error in adding the stock to watchlist:", error);
        }
    };

    useEffect(() => {
        const getNews = async () => {
            try {
                const news = await axios.get(`${BASE_URL}/dashboard/news/${symbol}/`, { withCredentials: true });
                setMarketData(news?.data?.news || news?.data);
            }
            catch (error) {
                console.error("Error fetching news:", error);
            }
        };
        getNews();
    }, [symbol]);

    return (
        <div className="stk-main-page-for-stock">
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} pageType="stock-details"
                profileData={{ name: userDetails?.name?.split(" ")[0] || "Guest", email: userDetails?.email || "N/A" }} />
            <DashboardHeader darkMode={darkMode} />
            <div className="stk-empty"></div>
            <div className="stk-stock-info-page">

                <div className="stk-stock-head">
                    <div className="stk-stock-name">{symbol}</div>
                    <button className="stk-add" value="Add" onClick={openAddModel}>Add</button>
                    <button className="stk-rmv" value="Remove" onClick={openRmvModel}>Remove</button>
                    <button className="stk-add-watchlist" val="Add-w" onClick={handleWatchlist}>Add to watchlist</button>
                </div>

                {showModal && stockData?.priceInfo && (
                    <StockAction
                        action={modalAction}
                        handler={setModalAction}
                        symbol={symbol}
                        currPrice={stockData.priceInfo.currentPrice}
                        priceChange={stockData.priceInfo.change}
                        pricePercentChange={stockData.priceInfo.changePercentage}
                        onClose={closeModel}
                    />
                )}

                <div className="stk-stock-price">
                    <div className="stk-abs">{stockData.priceInfo?.currentPrice ?? stockData.priceInfo?.previousClose ?? "--"}</div>
                    <div
                        className="stk-percentage"
                        data-testid="stk-percentage"
                        style={{
                            color:
                                Number(stockData?.priceInfo?.change) > 0
                                    ? "#00C853"
                                    : Number(stockData?.priceInfo?.change) < 0
                                        ? "#C81B00"
                                        : "#FFF",
                        }}
                    >
                        {Number(stockData?.priceInfo?.change) > 0
                            ? `+${stockData?.priceInfo?.change}`
                            : (stockData?.priceInfo?.change ?? "--")} (
                        {Number(stockData?.priceInfo?.changePercentage) > 0
                            ? `+${stockData?.priceInfo?.changePercentage}%`
                            : `${stockData?.priceInfo?.changePercentage ?? "--"}%`})
                    </div>
                </div>
                <div className="stk-stock-detail-navbar">
                    <a className="stk-detail-button" href="#heads1">Performance</a>
                    <a className="stk-detail-button" href="#heads2">Fundamentals</a>
                    <a className="stk-detail-button" href="#heads3">Financials</a>
                    <a className="stk-detail-button" href="#heads4">News</a>
                    <a className="stk-detail-button" href="#heads5">About Company</a>
                </div>

                <div className="stk-stock-chart">
                    <StockChart symbol={symbol} />
                </div>

                <div id="heads1">Performance</div>
                <div className="stk-performance">
                    <div className="stk-day-range">Day's range</div>

                    <div className="stk-price-range">
                        <div className="stk-range-field">
                            <span className="stk-low-f">Today's low:</span>
                            <span className="stk-low-v">{stockData.priceInfo?.dayLow}</span>
                        </div>

                        <hr />
                        <div className="stk-range-val">
                            <span className="stk-high-f">Today's high:</span>
                            <span className="stk-high-v">{stockData.priceInfo?.dayHigh}</span>
                        </div>

                    </div>
                </div>
                <div className="stk-more-info">
                    <div className="stk-info-left">
                        <FieldValue
                            className="stk-info"
                            fieldname="Previous Close"
                            value={stockData.priceInfo?.previousClose}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Open"
                            value={stockData.priceInfo?.open}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Volume"
                            value={stockData.priceInfo?.volume}
                        />
                    </div>
                    <div className="stk-info-right">
                        <FieldValue
                            className="stk-info"
                            fieldname={`Day's range`}
                            value={(stockData.priceInfo?.dayLow && stockData.priceInfo?.dayHigh) ? `${stockData.priceInfo.dayLow} - ${stockData.priceInfo.dayHigh}` : (stockData.priceInfo?.dayLow ?? stockData.priceInfo?.dayHigh)}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="52 week range"
                            value={stockData.priceInfo?.fiftyTwoWeekLow && stockData.priceInfo?.fiftytwoWeekHigh
                                ? `${stockData.priceInfo.fiftyTwoWeekLow} - ${stockData.priceInfo.fiftytwoWeekHigh}`
                                : (stockData.priceInfo?.fiftytwoWeekHigh)}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Market Cap (intraday)"
                            value={stockData.priceInfo?.marketCap}
                        />
                    </div>
                </div>

                <div id="heads2">Fundamentals</div>
                <div className="stk-fundamentals">
                    <div className="stk-info-left">
                        <FieldValue
                            className="stk-info"
                            fieldname="ROCE (TTM)"
                            value={stockData.fundamentals?.roceTTM}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="P/E Ratio (TTM)"
                            value={stockData.fundamentals?.peRatioTTM}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="P/B Ratio"
                            value={stockData.fundamentals?.pbRatio}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Industry P/E"
                            value={stockData.fundamentals?.industryPE}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Debt to Equity"
                            value={stockData.fundamentals?.debtToEquity}
                        />

                    </div>
                    <div className="stk-info-right">
                        <FieldValue
                            className="stk-info"
                            fieldname="ROE"
                            value={stockData.fundamentals?.roeTTM}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="EPS (TTM)"
                            value={stockData.fundamentals?.epsTTM}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Dividend Yield"
                            value={stockData.fundamentals?.dividendYield}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Book Value"
                            value={stockData.fundamentals?.bookValue}
                        />
                        <FieldValue
                            className="stk-info"
                            fieldname="Face Value"
                            value={stockData.fundamentals?.faceValue ?? "--"}
                        />

                    </div>
                </div>

                <div id="heads3">Financials</div>
                <div className="stk-financials">
                    <div className="stk-info-left">
                        <div className="stk-info-left-upper">
                            <div className="stk-inc-stat">Income Statement</div>

                            <FieldValue
                                className="stk-info"
                                fieldname="Revenue (TTM)"
                                value={stockData.financials?.revenueTTM}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Revenue Per Share (TTM)"
                                value={stockData.financials?.revenuePerShare}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Quarterly Revenue Growth (YOY)"
                                value={stockData.financials?.earningGrowthQuater}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Gross Profit (TTM)"
                                value={stockData.financials?.grossProfitTTM}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="EBITDA"
                                value={stockData.financials?.ebitda}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Net Income Available to Common (TTM)"
                                value={stockData.financials?.netIncome}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Diluted EPS (TTM)"
                                value={stockData.financials?.dilutedEPS}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Quarterly Earnings Growth (YOY)"
                                value={stockData.financials?.earningGrowthQuater}
                            />

                        </div>
                        <div className="stk-info-left-lower">
                            <div className="stk-prof-eff-metrics">Profitability & Efficiency Metrics</div>

                            <FieldValue
                                className="stk-info"
                                fieldname="Profit Margin"
                                value={stockData.profitability.profitMargin} />
                            <FieldValue
                                className="stk-info"
                                fieldname="Operating Margin (TTM)"
                                value={stockData.profitability.operatingMargin} />
                            <FieldValue
                                className="stk-info"
                                fieldname="Return on Assets (TTM)"
                                value={stockData.profitability.returnOnAssets} />
                            <FieldValue
                                className="stk-info"
                                fieldname="Return on Equity (TTM)"
                                value={stockData.profitability.returnOnEquity} />
                        </div>
                    </div>
                    <div className="stk-info-right">
                        <div className="stk-info-right-upper">
                            <div className="stk-bal-sheet">Balance Sheet</div>

                            <FieldValue
                                className="stk-info"
                                fieldname="Total Cash (MRQ)"
                                value={stockData.balenceSheet?.totalCash}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Total Cash Per Share (MRQ)"
                                value={stockData.balenceSheet?.totalCashPerShare}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Total Debt (MRQ)"
                                value={stockData.balenceSheet?.totalDebt}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Total Debt / Equity (MRQ)"
                                value={stockData.balenceSheet?.deptToEquity}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Current Ratio (MRQ)"
                                value={stockData.balenceSheet?.currentRatioMRQ}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Book Value Per Share (MRQ)"
                                value={stockData.balenceSheet?.bookValuePerShare}
                            />
                        </div>
                        <div className="stk-info-right-middle">
                            <div className="stk-cash-flow-stat">Cash Flow Statement</div>

                            <FieldValue
                                className="stk-info"
                                fieldname="Operating Cash Flow (TTM)"
                                value={stockData.cashFlow?.operatingCashFlow}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Levered Free Cash Flow (TTM)"
                                value={stockData.cashFlow?.freeCashFlow}
                            />
                        </div>
                        <div className="stk-info-right-lower">
                            <div className="stk-fisc-info">Fiscal Information</div>

                            <FieldValue
                                className="stk-info"
                                fieldname="Fiscal Year Ends"
                                value={stockData.fiscalInformation?.fiscalYearEnd}
                            />
                            <FieldValue
                                className="stk-info"
                                fieldname="Most Recent Quarter (MRQ)"
                                value={stockData.fiscalInformation?.MRQ}
                            />
                        </div>
                    </div>
                </div>

                <div id="heads4">News</div>
                <div className="stk-news">
                    <div className="stk-news-head">
                        <div className="stk-rec-news">Recent News: {symbol}</div>
                    </div>

                    <div className="stk-news-container">
                        {newsData.length > 0 ? (
                            <div className="stk-market-data">
                                {newsData.map((news, index) => (
                                    <MarketNewsItem
                                        key={index}
                                        headline={news.title}
                                        time={formatDate(news.providerPublishTime)}
                                        link={news.link} />
                                ))}
                            </div>

                        ) : (
                            <div className="stk-market-data">No news available for {symbol}.</div>
                        )
                        }
                    </div>
                </div>

                <div id="heads5">About Company</div>
                <div className="stk-about-company">
                    <h3>{stockData.Company?.longname} ({symbol}) </h3>
                    <div className="stk-sub-about">
                        <div className="stk-sub-info">
                            <span id="stk-span1">{stockData.Company.fulltimeemployees}</span>
                            <span id="stk-span2">Full-time employees</span>
                        </div>
                        <div className="stk-sub-info">
                            <span id="stk-span1">{stockData.fiscalInformation?.fiscalYearEnd}</span>
                            <span id="stk-span2">Fiscal year ends</span>
                        </div>
                        <div className="stk-sub-info">
                            <span id="stk-span1">{stockData.Company.sector}</span>
                            <span id="stk-span2">Sector</span>
                        </div>
                        <div className="stk-sub-info">
                            <span id="stk-span1">{stockData.Company?.industry}</span>
                            <span id="stk-span2">Industry</span>
                        </div>
                    </div>
                    <span className="stk-about-desc">{stockData.Company?.longdescription}</span>
                    <a className="stk-company-link" href={stockData.Company.website} target="_blank" rel="noopener noreferrer">{stockData.Company.website}</a>
                </div>


            </div>

            <div className="footer-div">
                <Footer darkMode={darkMode}
                    navigationLinks={[
                        { text: "Portfolio", href: "/portfolio" },
                        { text: "AI Insigths", href: "/ai-insight" },
                        { text: "Watchlist", href: "/watchlist" }
                    ]}
                    legalLinks={[
                        { text: "Privacy Policy", href: "#privacy" },
                        { text: "Terms Of Service", href: "#terms" },
                        { text: "Contact Us", href: "#contact" },
                    ]} />
            </div>
        </div>
    );
};
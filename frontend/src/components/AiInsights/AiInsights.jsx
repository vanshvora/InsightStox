import React,{useEffect,useState} from 'react'
import './AiInsights.css'
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.jsx';


const AiInsights = () => {
   const [formattedInsights, setFormattedInsights] = useState([]);
    const [error, setError] = useState();
    // const {userDetails} = useAppContext();
   /*-------------------------------------------------Function to format portfolio data into insights---------------------- */
   const formatPortfolioData = (jsonString) => {
     try {
       const data = JSON.parse(jsonString);
       const insights = [];
       
       insights.push(`• Dear , ${data.user.name} currently You have : ${data.summary.totalStocks} stocks in your portfolio.`);
       insights.push(`• Current Portfolio Value: ₹${Math.round(data.summary.totalValue).toLocaleString()}`);
       insights.push(`• Total Amount Invested: ₹${Math.round(data.summary.totalInvested).toLocaleString()}`);
       insights.push("");

       const profitLoss = data.summary.totalProfitLoss;
        const gainPercent = Number(data.summary.totalGainPercent).toFixed(2);
       if (profitLoss > 0) {
         insights.push(`• Overall Profit: ₹${Math.round(profitLoss).toLocaleString()} (${gainPercent}%)`);
       } else if (profitLoss < 0) {
         insights.push(`• Overall Loss: ₹${Math.round(Math.abs(profitLoss)).toLocaleString()} (${gainPercent}%)`);
       } else{
          insights.push(`• No Overall Profit or Loss: Your portfolio is currently neutral.`);
       }
        insights.push("");
       
       // Top Holding
       const topHolding = data.summary.largestHolding;
       insights.push(`• Largest Holding: ${topHolding.symbol} (${Math.round(topHolding.allocation)}% allocation)`);
        insights.push(`• Largest Holding Value: ₹${Math.round(topHolding.value).toLocaleString()}`);
        insights.push("");

       
      insights.push(`• Weighted Portfolio P/E: ${data.summary.weightedPE}`);
      insights.push(`• Weighted Dividend Yield: ${data.summary.weightedDivYield}%`);
      insights.push("");
       
      const gainers = data.performance.gainers;
    const losers = data.performance.losers;

    if (gainers.length > 0) {
      insights.push(`• Top Gainers: ${gainers.slice(0, 3).join(", ")}`);
    }
    if (losers.length > 0) {
      insights.push(`• Top Losers: ${losers.slice(0, 3).join(", ")}`);
    }
    insights.push("");

     if (data.summary.weightedPE < 12) {
      insights.push(`• Valuation Insight: Portfolio seems undervalued based on weighted P/E.`);
    } else if (data.summary.weightedPE > 25) {
      insights.push(`• Valuation Warning: Portfolio appears overvalued; review high P/E holdings.`);
    } else {
      insights.push(`• Fair Valuation: Portfolio P/E is within a normal range.`);
    }
    insights.push("");

      //  console.log("Formatted Insights:", insights);
       return insights;
     } catch (error) {
       console.error("Error parsing portfolio data:", error);
       return ["Unable to parse portfolio insights"];
     }
   };

/*-------------------------------------------------Handler to fetch portfolio analysis insights---------------------- */

const handlePortfolioAnalysis = async () => {
        try{
          const res = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/dashboard/allocation/",{withCredentials: true});
          console.log("AiInsights component mounted",res.data.reply);
          if(res.data.reply.statusCode === 400){
            // console.error("Error in response:", res.data.reply.message);
            setError(res.data.reply.message);
          }else{
            const formatted = formatPortfolioData(res.data.reply);
            console.log("Formatted Insights in state:", formatted);
            setFormattedInsights(formatted);
          }
        }
        catch(err){
          // console.error(err.message);
          setError(err.message);
        }
    }
    

/*-------------------------------------------------useEffect to call portfolio analysis on component mount---------------------- */
/*  
useEffect(() => {
    handlePortfolioAnalysis();
    const interval = setInterval(() => {
      handlePortfolioAnalysis();
    }, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  },[]);
  */
  
return (
  <div className="aiinsights-wrapper">
    <div className="card insights-card">
      <h2 className="ai-title">AI - Powered Insights</h2>
            <div className="insights">
              {formattedInsights.length > 0 ? (
                formattedInsights.map((val, index) => (
                  <p key={index} className="insight-item">{val}</p>
                ))
              ) : (
                <p >{error}</p>
              )}
            </div>
            <p className="view-all">
                <Link to="/ai-insight">Explore AI Insights →</Link>
            </p>
          </div>
  </div>
);

}

export default AiInsights

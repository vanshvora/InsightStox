import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import './Dashboard.css';
import 'primeicons/primeicons.css';
import DashboardHeader from '../components/Dashboard-Header.jsx';
import MarketMovers from '../components/MarketMovers/MarketMovers'
import WelcomeInvestor from '../components/WelcomeInvestor/WelcomeInvestor'
import PortfolioChart from '../components/PortfolioChart/PortfolioChart'
import MyHoldings from '../components/MyHoldings/MyHoldings'
import Navbar from '../components/Navbar.jsx';
import DataPrefetcher from '../components/DataPrefetcher.jsx';
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from 'react';
export const Dashboard = () => {
  const { darkMode, setDarkMode ,userDetails} = useAppContext();
  const navigate = useNavigate();
  const { ensureAuth } = useAppContext();

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
  return (
    <>
    <div className="dashboard-container">
       <DataPrefetcher />
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} pageType="dashboard" 
      profileData={{name: userDetails?.name?.split(" ")[0] || "Guest",email: userDetails?.email || "N/A"}}/>

      <DashboardHeader darkMode={darkMode}  />
      
      <div className="section-wrapper">
        <WelcomeInvestor />
        <PortfolioChart/>
        <MyHoldings/>
        <MarketMovers />
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
        ]}/>
      </div>
      
    </div>
    </>
  );
};

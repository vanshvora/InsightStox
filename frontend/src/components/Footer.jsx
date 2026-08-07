import React, { useState,useEffect } from "react";
import { Link } from "react-router-dom";
import github_logo from "../assets/github_logo.png";
import { PolicyModal } from "./PolicyModal";
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsCondition } from './TermsCondition';
import "./Footer.css";
import logofooter from "../assets/logofooter-navbar.svg";
import logotext from "../assets/logotext.svg";

const Footer = ({ darkMode ,navigationLinks=[],legalLinks=[] }) => {
    const [activeModal, setActiveModal] = useState(null);
    
  const openModal = (type) => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };
    useEffect(() => {
          const onEsc = (e) => {
              if (e.key === 'Escape') {
               setActiveModal(null);   
              }
          };
  
          window.addEventListener('keydown', onEsc);
  
          return () => window.removeEventListener('keydown', onEsc);
      }, []);

  return (
    <>
    <div className="footer_div" >
      <div className="footer_text_part">
        <div className="footer_upper_text_part">
          <div className="footer_first_column column_div">
            <div className="footer_web">
              
                <img src={logofooter} alt="Website logo" />
            </div>
            <div className="textcolumn">
              <div className="logotext">
                <img src={logotext} alt="InsightStox text logo" />
              </div>
              <div className="tagline_text">
                <p><>Analyze Smarter,<br/>Invest Better</></p>
              </div>
             
              <div className="github_logo">
                <img src={github_logo} alt="Github logo" />
              </div>
          </div>
          </div>

          <div className="footer_second_column column_div">
            <div className="navigation_text">
              <h2>NAVIGATION</h2>
            </div>
            {navigationLinks.map((link) => (
              <div key={link.text} className={`${link.className || "nav_link"}`}>
                <Link to={link.href}>{link.text}</Link>
              </div>
            ))}
          </div>

          <div className="footer_third_column column_div">
            <div className="legal_text">
              <h2>LEGAL</h2>
            </div>
             {legalLinks.map((link) => (
              <div className={`${link.className || "nav_link"}`} key={link.text}>
                {link.text === "Privacy Policy" ? (
              <a onClick={() => openModal("privacy")} style={{ cursor: "pointer" }}>
                {link.text}
              </a>
                ) : link.text === "Terms Of Service" ? (
              <a onClick={() => openModal("terms")} style={{ cursor: "pointer" }}>
                {link.text}
              </a>
              ) : (
              <Link to={link.href}>{link.text}</Link>
          )}
          </div>
            ))}
          </div>
        </div>
        <div className="footer_below_text_part">
          <div className="rights_text">
            <p><>© 2025 InsightStox. All Rights Reserved. This platform is for demonstration purposes only. All financial data and <br/>AI-powered suggestions are for informational purposes and should not be considered financial advice.</></p>
          </div>
        </div>
      </div>
    </div>
  
<PolicyModal
  title="Privacy Policy"
  content={<PrivacyPolicy />}
  isOpen={activeModal === "privacy"}
  onClose={closeModal}
/>

<PolicyModal
  title="Terms and Conditions"
  content={<TermsCondition />}
  isOpen={activeModal === "terms"}
  onClose={closeModal}
/>
  </>
  );
};

export default Footer;  

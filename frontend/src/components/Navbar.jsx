import React, { useState,useEffect } from "react";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";
import web_logo_without_bg_darkmode from "../assets/logofooter-navbar.svg";
import web_logo_without_bg_lightmode from "../assets/web_logo_without_bg_lightmode.png";
import themetoggledark from "../assets/themetoggledark.svg";
import profileicon from "../assets/profileicon.svg";
import routeicon from "../assets/routeicon.svg";
import exiticon from "../assets/exiticon.svg";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import { useAppContext } from "../context/AppContext";
// import tailwind from "tailwindcss/tailwind.css";
const Navbar = ({ darkMode, setDarkMode, pageType, profileData = {} }) => {
  
  axios.defaults.withCredentials = true;
  /*----------------------------------------------------State Varible------------------------------------------------------- */
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const handleProfileClick = () => setIsProfileOpen(true);
  const handleProfileClose = () => setIsProfileOpen(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const {userDetails} = useAppContext();


 /*----------------------------------------------------Functions------------------------------------------------------- */
  const handleNavigation = (path) => {
    navigate(path);
  };
  const handleLogout = async () => {
        try{
            await axios.post(import.meta.env.VITE_BACKEND_LINK + "/users/logout/", {withCredentials: true});
            navigate("/");
        }
        catch(err){
            console.error("Error during logout:", err.response?.data?.message || err.message);
        }
  }
  function checkPageType(){
    if(pageType !== "/" && pageType !== "my-profile" && pageType !== "data-privacy" && pageType !== "preferences" && pageType !== "help-support" && pageType !== "activity"){
      return true;
    }
    else return false;
}

  /*----------------------------------------------------UseEffect------------------------------------------------------- */
  useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth > 1100 && isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, [isMenuOpen]);

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {/* Show overlay whenever profile popup is open (not only on dashboard) */}
      {isProfileOpen && (
        <div className="profileoverlay" onClick={handleProfileClose}></div>
      )}
      {isMenuOpen && <div className="profileoverlay" onClick={toggleMenu}></div>}

      {/*-----------------------------------------Navbar---------------------------------------------------------------- */}
      <div className="navbar">
        <div className="left_btn logo">
          <a href="#"> <img src={darkMode? web_logo_without_bg_darkmode: web_logo_without_bg_lightmode} alt="Logo" /> </a>
        </div>


        <div className="center_btn">
          {pageType === "/" ? (
            <>
              <a className="navbar_btn" href="#feature">Features</a>
              <a className="navbar_btn" href="#HowItWorks">How it Works?</a>
              <a className="navbar_btn" href="#FAQs">FAQs</a>
            </>
          ) : (
            <>
              <Link 
                className={`navbar_btn ${location.pathname === "/dashboard" ? "active" : ""}`} 
                to="/dashboard"
              >
                Dashboard
              </Link>
              <Link 
                className={`navbar_btn ${location.pathname === "/portfolio" ? "active" : ""}`} 
                to="/portfolio"
              >
                Portfolio
              </Link>
                <Link 
                className={`navbar_btn ${location.pathname === "/watchlist" ? "active" : ""}`} 
                to="/watchlist"
              >
                Watchlist
              </Link>
              <Link 
                className={`navbar_btn ${location.pathname === "/ai-insight" ? "active" : ""}`} 
                to="/ai-insight"
              >
                AI Insights
              </Link>
              <Link 
                className={`navbar_btn ${location.pathname === "/compare-stocks" ? "active" : ""}`} 
                to="#"
              >
                Compare Stocks
              </Link>
            </>
          )}
        </div>

        <div className="right_btn">
          {pageType === "/" && (
            <Link to="/auth" onClick={() => {sessionStorage.setItem("isLogin", "true");sessionStorage.setItem("forgotpassword", "false");}}>
              <div className="login_btn">
                <button>Log In</button>
              </div>
            </Link>
          )}

          {/* Render profile button when profileData exists (logged-in), not only on dashboard */}
          {profileData && Object.keys(profileData).length > 0 && (
            <div className="profile_btn">
              <button onClick={handleProfileClick}>
                <img src={userDetails?.profileImage || profileicon} alt="Profile" style={checkPageType() ? {visibility: "visible"} : {visibility: "hidden"}}/>
              </button>
            </div>
          )}

          {/* <div className="toggle_btn">
            <button style = {{display : "none"}}onClick={() => setDarkMode(!darkMode)}>
              <img src={themetoggledark} alt="Toggle Theme" />
            </button>
          </div> */}
          <i className="menu_toggle pi pi-bars" onClick={toggleMenu}> 
          </i>
        </div>
      </div>
        {isMenuOpen && (
        <div className="mobile_menu">
          {pageType === "/" ? (
            <div className="menuoptions">
              <ul>
                 <Link to="/auth" onClick={() => {sessionStorage.setItem("isLogin", "true");
                                              sessionStorage.setItem("forgotpassword", "false");}}>
                <li>Log In</li>
                </Link>
                <a href="#feature"><li>Features</li></a>
                <a href="#HowItWorks"><li>How it Works?</li></a>
                <a href="#FAQs"><li className="lastli">FAQs</li></a>
              </ul>
            </div>
          ) : (
            <div className="menuoptions">
              <ul>
              <Link to="/dashboard"><li>Dashboard </li></Link>
              <Link to="/portfolio"><li>Portfolio</li></Link>
              <Link to="/watchlist"><li>Watchlist</li></Link>
              <Link to="/ai-insight"><li>AI Insights</li></Link>
              <Link to="#"><li className="lastli">Compare Stocks</li></Link>
             </ul>
              </div>
          )}
        </div>
      )}
      {isProfileOpen && (
        <div className="profilepopup">
          <div className="popupheading">
            <img src={userDetails?.profileImage || profileicon} alt="Profile" />
            <div className="name-email">
              <h3>{profileData.name}</h3>
              <span>{profileData.email}</span>
            </div>
          </div>
          <div className="popupoptions">
            <ul>
              <li onClick={() => handleNavigation("/my-profile")}>My Profile <img src={routeicon} alt="" /></li>
              <li onClick={() => handleNavigation("/data-privacy")}>Manage <img src={routeicon} alt="" /></li>
              <li onClick={() => handleNavigation("/help-support")}>Help & Support <img src={routeicon} alt="" /></li>
              <li onClick={handleLogout}>Log Out <img src={exiticon} alt="" /></li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../pages/DataPrivacy.css";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { Sidebar } from "../components/Sidebar.jsx";
import Toggle from "../components/Toggle.jsx";
import GoToArrow from "../assets/routeicon.svg";
import { useAppContext } from "../context/AppContext";
import { PolicyModal } from "../components/PolicyModal";
import { PrivacyPolicy } from "../components/PrivacyPolicy";
import { TermsCondition } from "../components/TermsCondition";


export const DataPrivacy = () => {
    axios.defaults.withCredentials = true;
    const { darkMode, setDarkMode, userDetails } = useAppContext();
    const [aiToggle, setAiToggle] = useState(false);
    const [downloadRequested, setDownloadRequested] = useState(false);
    const [deleteRequested, setDeleteRequested] = useState(false);
    // 🟢 New state to track which modal is open ('privacy', 'terms', or null)
    const [activeModal, setActiveModal] = useState(null);

    // 🟢 NEW HANDLER: Opens the specified modal
    const openModal = (type) => {
        setActiveModal(type);
    };

    // 🟢 NEW HANDLER: Closes the modal
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

    // --- EXISTING HANDLERS ---
    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete your account? This action is irreversible.")) {
            setDeleteRequested(true);
            try {
                await axios.delete(
                    import.meta.env.VITE_BACKEND_LINK + "/users/account/",
                    { withCredentials: true }
                );
                alert("Account deletion initiated. You will be logged out shortly.");
                // TODO: Handle redirection/logout here
            } catch (err) {
                console.error("Error deleting account:", err.response?.data?.message || err.message);
                alert("Account deletion failed. Please try again.");
            } finally {
                setDeleteRequested(false);
            }
        }
    };

    const handleDownload = async () => {
        setDownloadRequested(true);
        try {
            const res = await axios.get(
                import.meta.env.VITE_BACKEND_LINK + "/users/portfolio/download/",
                { withCredentials: true }
            );
            console.log("Data download initiated:", res.data);
            alert("Your data download should start shortly or be delivered via email.");
        } catch (err) {
            console.error("Error initiating data download:", err.response?.data?.message || err.message);
            alert("Data download failed. Please try again.");
        } finally {
            setDownloadRequested(false);
        }
    };

    const handleToggleChange = async (checked) => {
        const previousToggleState = aiToggle;
        setAiToggle(checked); // Optimistic update

        try {
            await axios.patch(
                import.meta.env.VITE_BACKEND_LINK + "/users/preferences/ai-suggestion/",
                { aisuggestion: checked },
                { withCredentials: true }
            );
            console.log("Successfully updated AI toggle:", checked);
        } catch (err) {
            console.error("Failed to update AI toggle:", err);
            alert("Unable to save preference. Please try again.");
            setAiToggle(previousToggleState); // Revert on error
        }
    };

    useEffect(() => {
        const fetchDataPrivacySettings = async () => {
            try {
                const res = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/users/data-privacy/", { withCredentials: true });
                const user = res.data?.data;
                if (user && typeof user.aisuggestion !== 'undefined') {
                    setAiToggle(user.aisuggestion);
                }
            } catch (err) {
                console.error("Error fetching info:", err.response?.data?.message || err.message);
            }
        };
        fetchDataPrivacySettings();
    }, []);

    // --- RENDER ---
    return (
        <div className="Page">
            <Navbar
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                pageType="myprofile"
                profileData={{
                    name: userDetails?.name,
                    email: userDetails?.email,
                    profileImage: userDetails?.profileImage
                }}
            />

            <div className="Container">
                <Sidebar
                    primaryData={{
                        name: userDetails?.name,
                        email: userDetails?.email,
                        profileImage: userDetails?.profileImage
                    }}
                />

                <main className="MainContent-data-privacy">
                    <h2 className="title">Data & Privacy</h2>

                    <div className="privacy-section">
                        {/* AI Insights */}
                        <div className="ai-insights">
                            <p className="main-concept">AI-Powered Insights & Suggestions</p>
                            <div className="usage-brief1">
                                <p className="usage-brief"> 	Allow us to securely analyze your portfolio data to provide personalized insights.</p>
                                <div className="toggle-component">
                                    <Toggle value={aiToggle} onChange={handleToggleChange} className="toggle400" />
                                </div>
                            </div>
                        </div>

                        <div className="hr" />

                        {/* Privacy Policy */}
                        <div className="analytics-improvement">
                            <p className="main-concept">Privacy Policy</p>
                            <div className="usage-brief">
                                Read our Privacy Policy
                                {/* 🟢 Updated onClick to open the 'privacy' modal */}
                                <button onClick={() => openModal('privacy')}>
                                    <img className="more-info" src={GoToArrow} alt="arrow" />
                                </button>
                            </div>
                        </div>

                        <div className="hr" />

                        {/* Terms */}
                        <div className="consent-compliance">
                            <p className="main-concept">Terms & Condition</p>
                            <div className="usage-brief"> {/* Changed p tag to div for button placement */}
                                Read our Terms & Condition
                                {/* 🟢 Updated onClick to open the 'terms' modal */}
                                <button onClick={() => openModal('terms')}>
                                    <img className="more-info" src={GoToArrow} alt="arrow" />
                                </button>
                            </div>
                        </div>

                        <div className="hr" />

                        {/* Manage Data and Delete Account sections here... */}

                        <div className="manage-data">
                            <p className="main-concept">Manage Your Data</p>
                            <div className="usage-brief1">
                                <p className="usage-brief">
                                    Export a copy of your personal and portfolio data in CSV file.
                                </p>
                                <button onClick={handleDownload} className="download" disabled={downloadRequested}>
                                    {downloadRequested ? 'Downloading...' : 'Download Data'}
                                </button>
                            </div>
                        </div>

                        <div className="hr" />

                        <div className="delete-account">
                            <div className="main-concept">Delete Account</div>
                            <div className="usage-brief2">
                                <p className="del-acc-p">
                                    Permanently delete your account, portfolio data, and all personal information. This action is irreversible.
                                </p>
                                <button onClick={handleDelete} className="delete" disabled={deleteRequested}>
                                    {deleteRequested ? 'Deleting...' : 'Delete My Account'}
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            <div className="footer-div">
                <Footer
                    darkMode={darkMode}
                    navigationLinks={[
                        { text: "Portfolio", href: "/portfolio" },
                        { text: "AI Insights", href: "/ai-insight" },
                        { text: "Watchlist", href: "/watchlist" },
                        { text: "Compare Stocks", href: "#" }
                    ]}
                    legalLinks={[
                        { text: "Privacy Policy", href: "#privacy" },
                        { text: "Terms Of Service", href: "#terms" },
                        { text: "Contact Us", href: "#contact" }
                    ]}
                />
            </div>

            {/* 🟢 MODAL RENDERING: Display the modals at the bottom of the component */}
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

        </div>
    );
};
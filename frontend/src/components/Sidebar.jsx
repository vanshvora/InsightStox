import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import GoToArrow from "../assets/routeicon.svg";
import profileImg from "../assets/profileicon.svg";
import LogoutSym from "../assets/logoutSym.png";
import "./Sidebar.css";

export const Sidebar = ({ primaryData = {} }) => {

    axios.defaults.withCredentials = true;
    const navigate = useNavigate();
    const location = useLocation();
    const [currentField, setActiveField] = useState(localStorage.getItem("activeMenu") || "My Profile");

    useEffect(() => {
        const path = location.pathname.toLowerCase();
        if (!currentField) {
            const saved = localStorage.getItem("activeMenu");
            if (saved) {
                setActiveField(saved);
                return;
            }
        }

        if (path.includes("/data-privacy")) setActiveField("Data & Privacy");
        else if (path.includes("/activity")) setActiveField("Activity");
        else if (path.includes("/help-support")) setActiveField("Help & Support");
        else setActiveField("My Profile");

    }, [location.pathname]);

    const handleLogout = () => {
        sessionStorage.setItem("isLoggingOut", "true");
        axios.post(import.meta.env.VITE_BACKEND_LINK + "/users/logout/", {}, { withCredentials: true })
          .catch(e => console.error("Error during logout:", e))
          .finally(() => {
            sessionStorage.removeItem("isLoggingOut");
          });
          
        localStorage.removeItem("activeMenu");
        window.location.href = "/";
    }

    const handleMenuClick = (fieldName) => {
        if (fieldName === "Logout") {
            handleLogout();
            return;
        }

        setActiveField(fieldName);
        localStorage.setItem("activeMenu", fieldName);

        const route = fieldName.toLowerCase().replace(/&/g, "-")
            .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        navigate(`/${route}`);
    };

    return (
        <aside className="Sidebar">
            <div className="ProfileSection">
                <div className="Avatar">
                    <img src={primaryData?.profileImage || profileImg} alt="Profile Pic" />
                </div>
                <h2>{primaryData?.name}</h2>
                <p className="Email">{primaryData?.email}</p>
            </div>

            <nav className="Menu">
                {[
                    "My Profile",
                    "Data & Privacy",
                    "Activity",
                    "Help & Support",
                    "Logout",
                ].map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handleMenuClick(item)}
                        className={`Sidebar-item ${currentField === item ? "Active" : ""}` }
                        data-testid="activity-item"
                    >
                        {item}
                        <img
                            className={`go-to`}
                            src={item === "Logout" ? LogoutSym : GoToArrow}
                            alt="go-to"
                        />
                    </button>
                ))}
            </nav>
        </aside>
    );
};

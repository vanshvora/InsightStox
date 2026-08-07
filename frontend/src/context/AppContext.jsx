import { createContext,useContext,useState,useEffect } from "react";
import axios from "axios";
import { GetUserDetails } from "../utils/getUserDetails.js"; 
import Swal from "sweetalert2";
const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(true);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [userDetails, setUserDetails] = useState(null); 
    const [userLoggedIn, setUserLoggedIn] = useState(false);
    const [headerStocks, setHeaderStocks] = useState(null);
    const [changeInProfile, setChangeInProfile] = useState(null);
    const [headerStocksTimestamp, setHeaderStocksTimestamp] = useState(null);
    const val = { 
        darkMode, setDarkMode,
        userDetails, setUserDetails,
        userLoggedIn, setUserLoggedIn,
        isSearchActive, setIsSearchActive,
        headerStocks, setHeaderStocks,
        headerStocksTimestamp, setHeaderStocksTimestamp,
        setChangeInProfile

    };
    useEffect(() => {
        GetUserDetails(setUserDetails);
    }, [userLoggedIn, changeInProfile]);

    // Check token by calling backend endpoint. Returns boolean.
    const checkToken = async () => {
        try {
            const res = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/users/token/check/");
            return Boolean(res?.data?.success);
        } catch (err) {
            //console.error("checkToken error:", err);
            return false;
        }
    };

    // ensureAuth controls navigation depending on whether the current page
    // is an auth/home page (isAuthOrHome = true) or a protected page (false).
    // - If isAuthOrHome === true: if token exists => navigate to /dashboard
    // - If isAuthOrHome === false: if token missing => alert and navigate to /
    const ensureAuth = async (navigate, isAuthOrHome = false) => {
        const hasToken = await checkToken();
        if (isAuthOrHome) {
            if (hasToken) navigate("/dashboard");
        } else {
            if (!hasToken) {
                try {
                    // Inform the user and redirect to home/auth
                    // Using window.alert for simplicity; components may choose custom UI.
                    Swal.fire(
                        {
                            title: "Session Expired",
                            text: "Session expired or not authenticated. Redirecting to home.",
                            icon: "warning",
                            background: "#0d0d0d",        // black background
                            color: "rgb(0, 200, 83)",             // soft green text
                            confirmButtonColor: "#33ff57", // bright green button
                            confirmButtonText: "Login Again",
                        }
                    );
                } catch (e) {
                    // ignore alert failures in non-browser tests
                }
                navigate("/");
            }
        }
        return hasToken;
    };

    const contextValue = { ...val, checkToken, ensureAuth };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);

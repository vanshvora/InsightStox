// src/pages/ActivitySessionHistory.jsx
import React, { useState, useEffect } from "react";
import "../pages/ActivitySessionHistory.css";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { Sidebar } from "../components/Sidebar.jsx";
import axios from "axios";

// Use environment variable when available, otherwise fallback to localhost (satisfies both A and B)
const BASE = (import.meta && import.meta.env && import.meta.env.VITE_BACKEND_LINK) || "http://localhost:8000";

// Reusable hook for See More
const useSeeMore = (initialData, limit) => {
  const [fullData, setFullData] = useState(initialData || []);
  const [showAll, setShowAll] = useState(false);

  const displayData = showAll ? fullData : fullData.slice(0, limit);

  const toggleSeeMore = () => setShowAll(prev => !prev);

  const updateFullData = (newData) => setFullData(newData || []);

  const isExpandable = fullData.length > limit;

  return { displayData, showAll, toggleSeeMore, isExpandable, updateFullData };
};

export const ActivitySessionHistory = () => {
  const [darkMode, setDarkMode] = useState(true);
  axios.defaults.withCredentials = true;

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    profimg: "",
  });

  // Active Sessions
  const [activeSessions, setActiveSessions] = useState([]);

  // Security Alerts (show 3 by default)
  const {
    displayData: securityAlerts,
    showAll: showAllSecurityAlerts,
    toggleSeeMore: toggleSecurityAlerts,
    isExpandable: isAlertsExpandable,
    updateFullData: updateSecurityAlertsData,
  } = useSeeMore([], 3);

  // Activity History (show 4 by default)
  const {
    displayData: recentActivities,
    showAll: showAllRecentActivities,
    toggleSeeMore: toggleRecentActivities,
    isExpandable: isActivitiesExpandable,
    updateFullData: updateRecentActivitiesData,
  } = useSeeMore([], 4);

  // Fetch everything in one function
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1️⃣ Fetch Profile + Embedded Alerts & Activities
        const profileRes = await axios.get(`${BASE}/users/profile/`, { withCredentials: true });
        const user = profileRes.data?.data;
        const history = profileRes.data?.history;

        if (user) {
          setUserInfo({
            name: user.name || "",
            email: user.email || "",
            profimg: user.profileImage || "",
          });
        }

        if (history?.activities) {
          updateRecentActivitiesData(
            history.activities.map((activity) => ({
              id: activity.createdAt,
              action: activity.message,
              date: new Date(activity.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            }))
          );
        }

        if (history?.alerts) {
          updateSecurityAlertsData(
            history.alerts.map((alert) => ({
              id: alert.createdAt,
              text: alert.message,
              date: new Date(alert.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            }))
          );
        }

        // 2️⃣ Fetch Active Sessions
        const sessionRes = await axios.get(`${BASE}/users/activity/`, { withCredentials: true });
        const sessions = sessionRes.data?.activeSessions;

        if (sessions) {
          setActiveSessions(
            sessions.map((session) => ({
              id: session.token || Math.random().toString(36).slice(2),
              device: `${session.browser_type || "Unknown"} - ${session.os_type || "Unknown"}`,
              lastActive: session.last_active_time
                ? new Date(session.last_active_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : "Unknown",
            }))
          );
        }

        // 3️⃣ Fetch All Security Alerts (Full)
        const alertsRes = await axios.get(`${BASE}/users/security-alerts/`, { withCredentials: true });
        const alerts = alertsRes.data?.alerts;

        if (alerts) {
          updateSecurityAlertsData(
            alerts.map((alert) => ({
              id: alert.createdAt,
              text: alert.message,
              date: new Date(alert.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            }))
          );
        }

        // 4️⃣ Fetch Full Activity History
        const activityRes = await axios.get(`${BASE}/users/activity/all/`, { withCredentials: true });
        const activities = activityRes.data?.history;

        if (activities) {
          updateRecentActivitiesData(
            activities.map((activity) => ({
              id: activity.createdAt,
              action: activity.message,
              date: new Date(activity.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            }))
          );
        }
      } catch (err) {
        // single point to log fetch errors
        console.error("Error fetching all data:", err);
      }
    };

    fetchAllData();
    // Note: empty deps since this should run once on mount
  }, []);

  // Sign out single device
  const handleSignOut = async (sessionId) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));

    try {
      await axios.post(`${BASE}/users/logout/session/`, { token: sessionId }, { withCredentials: true });
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Sign out all devices
  const handleSignOutAll = async () => {
    setActiveSessions([]);

    try {
      await axios.post(`${BASE}/users/logout/all/`, {}, { withCredentials: true });
    } catch (err) {
      console.error("Error signing out all:", err);
    }
  };

  // Download Activity
  const handleDownloadActivity = async () => {
    try {
      await axios.get(`${BASE}/users/activity/download/`, { withCredentials: true });
    } catch (err) {
      console.error("Error downloading report:", err);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    // client optimistic update
    updateRecentActivitiesData([]);

    try {
      await axios.delete(`${BASE}/users/activity/clear/`, { withCredentials: true });
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  return (
    <div className="Page" data-testid="activity-session-page">
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        pageType="myprofile"
        profileData={userInfo}
      />

      <div className="Container">
        <Sidebar
          primaryData={{
            name: userInfo.name,
            email: userInfo.email,
            profileImage: userInfo.profimg,
          }}
        />

        <main className="MainContent">
          <div className="activity-and-session">
            <h2>Activity & Session History</h2>
          </div>

          {/* Active Sessions */}
          <div className="header-section" data-testid="active-sessions-section">
            <h3>Active Sessions</h3>
            <p>Manage all devices currently logged into your account</p>

            <div className="activity-list" data-testid="active-sessions-list">
              {activeSessions && activeSessions.length > 0 ? (
                activeSessions.map((session) => (
                  <div key={session.id} className="activity-item" data-testid="activity-item">
                    <span className="device">{session.device}</span>
                    <span className="dot" aria-hidden="true" />
                    <span className="date">{session.lastActive}</span>

                    <button
                      className="signout"
                      data-testid="signout-button"
                      onClick={() => handleSignOut(session.id)}
                    >
                      Sign Out
                    </button>
                  </div>
                ))
              ) : (
                <div data-testid="no-active-sessions">No active sessions</div>
              )}

              <button
                className="sign-out-all"
                data-testid="signout-all-button"
                onClick={handleSignOutAll}
              >
                Sign Out from All Devices
              </button>
            </div>
          </div>

          <div className="divider" />

          {/* Security Alerts */}
          <div className="header-section" data-testid="security-alerts-section">
            <h3>Security Alerts</h3>
            {isAlertsExpandable && (
              <button
                className="seemore"
                data-testid="security-seemore-button"
                onClick={toggleSecurityAlerts}
              >
                {showAllSecurityAlerts ? "See Less" : "See More"}
              </button>
            )}

            <div className="activity-list" data-testid="security-alerts-list">
              {securityAlerts && securityAlerts.length > 0 ? (
                securityAlerts.map((alert) => (
                  <div key={alert.id} className="security-alerts" data-testid="security-alert">
                    <span className="dot" aria-hidden="true" /> {alert.text} — {alert.date}
                  </div>
                ))
              ) : (
                <div data-testid="no-security-alerts">No security alerts</div>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Activity History */}
          <div className="header-section" data-testid="activity-history-section">
            <h3>Activity History</h3>
            {isActivitiesExpandable && (
              <button
                className="seemore"
                data-testid="activity-seemore-button"
                onClick={toggleRecentActivities}
              >
                {showAllRecentActivities ? "See Less" : "See More"}
              </button>
            )}

            <div className="activity-list" data-testid="activity-history-list">
              {recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="security-alerts" data-testid="activity-item">
                    <span className="dot" aria-hidden="true" /> {activity.action} — {activity.date}
                  </div>
                ))
              ) : (
                <div data-testid="no-activities">No activities</div>
              )}
            </div>

            <div className="activity-actions">
              <button
                className="download-activity"
                data-testid="download-activity-button"
                onClick={handleDownloadActivity}
              >
                Download Activity Report (PDF)
              </button>

              <button
                className="clear-history"
                data-testid="clear-history-button"
                onClick={handleClearHistory}
              >
                Clear Activity History
              </button>
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

export default ActivitySessionHistory;

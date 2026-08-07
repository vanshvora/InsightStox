import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./MyHoldings.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
const HOLDINGS_API = `${BACKEND_URL}/portfolio/holdings/`;

const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MyHoldings = () => {
  const navigate = useNavigate();
  const { data: holdings = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ["portfolioHoldings"],
    queryFn: async () => {
      const res = await axios.get(HOLDINGS_API, { withCredentials: true });
      if (!res.data || !Array.isArray(res.data.data)) {
        throw new Error("Invalid response format from server");
      }
      return res.data.data;
    },
  });

  const error = queryError ? `Failed to load holdings: ${queryError.message}` : null;

  if (loading) {
    return (
      <div className="myholdings-wrapper">
        <div className="card holdings-card">
          <h2 className="header-title">My Holdings</h2>
          <p>Loading holdings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="myholdings-wrapper">
        <div className="card holdings-card">
          <h2 className="header-title">My Holdings</h2>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="myholdings-wrapper">
      <div className="card holdings-card">
        <h2 className="header-title">My Holdings</h2>

        {holdings.length === 0 ? (
          <div className="myholdings-table-container myholdings-empty-container">
            <div className="myholdings-empty-state">
              <p className="myholdings-empty-title">Nothing in holdings yet</p>
            </div>
          </div>
        ) : (
          <div className="myholdings-table-container">
            <table className="myholdings-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Qty</th>
                  <th>Avg. Price</th>
                  <th>Current Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((item, index) => {
                  return (
                    <tr
                      key={index}
                      className="myholdings-row"
                      onClick={() => navigate(`/stockdetails/${item.symbol}`)}
                    >
                      <td>
                        <div className="myholdings-company-cell">
                          <span className="myholdings-company-name">{item.name || item.symbol}</span>
                          <span className="myholdings-company-symbol">{item.symbol}</span>
                        </div>
                      </td>
                      <td>
                        <span className="myholdings-primary">{item.shares}</span>
                      </td>
                      <td>
                        <span className="myholdings-primary">{formatAmount(item.avgPrice)}</span>
                      </td>
                      <td>
                        <span className="myholdings-primary">{formatAmount(item.lastPrice)}</span>
                      </td>
                      <td>
                        <span className="myholdings-primary">{formatAmount(item.marketValue)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyHoldings;

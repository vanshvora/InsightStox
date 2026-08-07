import React, { useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import "./StockAction.css";
import Swal from "sweetalert2";
import "./alert.css";

const toNumber = (value) => {
    if (value === null || value === undefined || value === "" || value === "--") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const formatMoney = (value) => {
    const n = toNumber(value);
    return n === null ? "--" : n.toFixed(2);
};

const formatSigned = (value, suffix = "") => {
    const n = toNumber(value);
    if (n === null) return `--${suffix}`;
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}${suffix}`;
};

const PORTFOLIO_QUERY_KEYS = [
    ["portfolioChartData"],
    ["dashboardValuation"],
    ["portfolioValuation"],
    ["portfolioHoldings"],
    ["portfolioSummary"],
    ["portfolioFundamentals"],
];

const StockAction = ({ action, handler, symbol, currPrice, priceChange, pricePercentChange, onClose }) => {
    const BASE_URL = import.meta.env.VITE_BACKEND_LINK;
    const queryClient = useQueryClient();
    const [quantity, setQuantity] = useState("");
    axios.defaults.withCredentials = true;

    const price = toNumber(currPrice);
    const change = toNumber(priceChange);
    const changePct = toNumber(pricePercentChange);
    const qty = toNumber(quantity) ?? 0;
    const total = price === null ? null : price * qty;

    const toggleModel = () => {
        setQuantity("");
        handler(action === "BUY" ? "SELL" : "BUY");
    };

    const handleSubmit = async () => {
        if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
            Swal.fire({
                toast: true,
                position: "top",
                icon: "error",
                title: "Please enter a valid integer quantity.",
                iconColor: "#ff4b4b",
                background: "#1a1a1a",
                showConfirmButton: false,
                timer: 3000,
                customClass: {
                    popup: "small-toast"
                }
            });
            return;
        }

        if (price === null) {
            Swal.fire({
                toast: true,
                position: "top",
                icon: "error",
                title: "Price unavailable. Please wait for stock data to load.",
                iconColor: "#ff4b4b",
                background: "#1a1a1a",
                showConfirmButton: false,
                timer: 3000,
                customClass: {
                    popup: "small-toast"
                }
            });
            return;
        }

        try {
            await axios.post(
                `${BASE_URL}/dashboard/transactions/`,
                { symbol, quantity: Number(quantity), price, type: action },
                { withCredentials: true }
            );

            PORTFOLIO_QUERY_KEYS.forEach((queryKey) =>
                queryClient.invalidateQueries({ queryKey })
            );

            Swal.fire({
                toast: true,
                position: "top",
                icon: "success",
                title: `Transaction done of amount: ${(price * Number(quantity)).toFixed(2)}`,
                iconColor: "#33ff57",
                background: "#1a1a1a",
                showConfirmButton: false,
                timer: 3000,
                customClass: {
                    popup: "small-toast"
                }
            });
            onClose();
        } catch (err) {
            console.error("Error checking holding:", err);
            Swal.fire({
                toast: true,
                position: "top",
                icon: "error",
                title: err.response?.data?.message || "Transaction failed.",
                iconColor: "#ff4b4b",
                background: "#1a1a1a",
                showConfirmButton: false,
                timer: 3000,
                customClass: {
                    popup: "small-toast"
                }
            });
            onClose();
        }
    };

    return (
        <div className="model-overlay">
            <div
                className="model-box"
                style={{
                    background: action === "BUY"
                        ? "linear-gradient(#002b12ff 14%, #0e0e0e 14%)"
                        : "linear-gradient(#310700ff 14%, #0e0e0e 14%)",
                }}
            >
                <h2>{action === "BUY" ? "Add to Portfolio" : "Remove from Portfolio"}</h2>

                <div className="model-name-toggle">
                    <div className="model-stock-symbol">{symbol}</div>
                    <div className="model-toggle-container">
                        <span
                            className={`model-buy ${action === "BUY" ? "active-buy" : ""}`}
                            onClick={toggleModel}
                        >
                            Add
                        </span>
                        <span
                            className={`model-sell ${action === "SELL" ? "active-sell" : ""}`}
                            onClick={toggleModel}
                        >
                            Rmv
                        </span>
                    </div>
                </div>

                <div className="model-price-info">
                    <div className="model-price">{formatMoney(price)}</div>
                    <div
                        className="model-price-change"
                        data-testid="model-price-change"
                        style={{
                            color:
                                change > 0
                                    ? "#00C853"
                                    : change < 0
                                        ? "#c81b00ff"
                                        : "#FFF",
                        }}
                    >
                        {formatSigned(change)} ({formatSigned(changePct, "%")})
                    </div>
                </div>

                <div className="model-tot-amount">
                    <label className="model-label">Total Amount</label>
                    <span className="model-calc">{formatMoney(total)}</span>
                </div>

                <>
                    <label htmlFor="stock-quantity">Enter Quantity</label>
                    <div className="model-custom-input">
                        <input
                            id="stock-quantity"
                            type="number"
                            value={quantity}
                            min="1"
                            onKeyDown={(e) => {
                                if (["e", "E", "+", "-"].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) => setQuantity(e.target.value)}
                            style={{
                                caretColor: action === "BUY" ? "#00c853" : "#c81b00",
                                border: action === "BUY" ? "1px solid #00c853" : "1px solid #c81b00"
                            }}
                        />
                        <div className="controls">
                            <button type="button" onClick={() => setQuantity((prev) => Number(prev || 0) + 1)}>▲</button>
                            <button type="button" onClick={() => setQuantity((prev) => Math.max(0, Number(prev || 0) - 1))}>▼</button>
                        </div>
                    </div>
                    <button
                        className={`model-confirm-btn ${action === "BUY" ? "BUY" : "SELL"}`}
                        onClick={handleSubmit}
                    >
                        Confirm
                    </button>
                </>

                <button className="model-cancel-btn" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default StockAction;

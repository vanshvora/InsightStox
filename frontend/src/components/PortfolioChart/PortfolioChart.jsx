import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./PortfolioChart.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function PortfolioChart() {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Portfolio Value",
        data: [],
        borderColor: "#00c853",
        borderWidth: 1.75,
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  });
  const [hiddenDates, setHiddenDates] = useState([]);

  const [range, setRange] = useState("30d");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // track screen width so we can adjust ticks on small screens
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  //CACHE ADDED
  const cacheRef = useRef(null);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  axios.defaults.withCredentials = true;

  const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
  const VALUATION_API = `${BACKEND_URL}/dashboard/portfolio-valuation/`;

  // Dynamic Chart.js Options Based on Range
  const options = useMemo(() => {
    const isNarrowDays = screenWidth < 900 && range === "30d";
    const maxTicks = isNarrowDays ? Math.max(3, Math.floor(screenWidth / 60)) : undefined;

    return {
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        line: { borderWidth: 1.75 }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Portfolio Performance",
          color: "#00C853",
          font: { size: 22},
        },
        tooltip: {
          enabled: true,
          displayColors: false,
          backgroundColor: "#09090B",
          borderColor: "#00C853",
          borderWidth: 1,
          bodyColor: "#00C853",
          padding: 10,
          cornerRadius: 4,

          parser: () => { },//✅VERY IMPORTANT FIX

          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex;
              const iso = hiddenDates[index];
              const d = new Date(iso);

              return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            },
            label: (context) => {
              let label = context.dataset.label || "";
              if (label) label += ": ";
              if (context.parsed.y !== null)
                label += `₹${context.parsed.y.toLocaleString()}`;
              return label;
            },
          },
        },
      },
      interaction: { mode: "index", intersect: false },
      
      scales: {
        x: {
          type: "category", //✅FIX:prevents all date parsing
          ticks: {
            color: "#fff",
            // only auto-skip and limit ticks on small screens when viewing '30d' (days)
            autoSkip: isNarrowDays ? true : false,
            maxTicksLimit: maxTicks,
            maxRotation: 0,
            minRotation: 0,
          },
          grid: {
            display: true,
            color: (context) => {
              if (range === "30d") return "rgba(0,0,0,0)";
              const label = context.tick.label;
              return label ? "#3F3F46" : "rgba(0,0,0,0)";
            },
            lineWidth: (context) => {
              const label = context.tick.label;
              return label ? 1.2 : 0;
            },
          },
        },
        y: {
          ticks: {
            color: "#fff",
            callback: (v) => v.toLocaleString(),
          },
          grid: { color: "#3F3F46" },
        },
      },
    };
  }, [range, hiddenDates, screenWidth]); //✅keep tooltip in sync with real dates and respond to width

  const fetchPortfolioData = async () => {
    try {
      setError("");
      setLoading(true);

      // USE CACHE FIRST
      if (cacheRef.current) {
        const daily = cacheRef.current;
        updateChartWithData(daily);
        setLoading(false);
        return;
      }

      const response = await axios.get(VALUATION_API);
      const { data } = response.data || {};
      if (!data?.daily) throw new Error("Backend data missing.");

      const daily = data.daily;

      //SAVE TO CACHE
      cacheRef.current = daily;

      updateChartWithData(daily);

    } catch (err) {
      console.error("Error fetching valuation data:", err);
      setError(
        err.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to fetch portfolio performance data."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateChartWithData = (daily) => {
    let labels = [];
    let values = [];

    if (range === "30d") {
      const sliced = daily.slice(-30);

      labels = sliced.map((d) => {
        const date = new Date(d.date);
        const day = date.getDate();
        const monthShort = date.toLocaleDateString("en-US", { month: "short" });
        // Show month name only when day === 1 (e.g., "Nov 1"), otherwise show day number only
        return day === 1 ? `${monthShort} 1` : String(day);
      });
      setHiddenDates(sliced.map((d) => d.date));

      values = sliced.map((d) => d.valuation);
    }

    else if (range === "6m") {
      const sliced = daily.slice(-182);

      labels = sliced.map((d) => {
        const date = new Date(d.date);
        return date.getDate() === 1
          ? date.toLocaleDateString("en-US", { month: "short" })
          : "";
      });
      setHiddenDates(sliced.map((d) => d.date));

      values = sliced.map((d) => d.valuation);
    }

    else if (range === "1y") {
      const sliced = daily.slice(-365);

      labels = sliced.map((d) => {
        const date = new Date(d.date);
        return date.getDate() === 1
          ? date.toLocaleDateString("en-US", { month: "short" })
          : "";
      });
      setHiddenDates(sliced.map((d) => d.date));

      values = sliced.map((d) => d.valuation);
    }

    setChartData({
      labels,
      datasets: [
        {
          label: "Portfolio Value",
          data: values,
          borderColor: "#00c853",
          backgroundColor: "rgba(0, 200, 83, 0.15)",
          tension: 0.35,
          fill: false,
          pointRadius: 0,
        },
      ],
    });
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [range]);

  if (loading){
    return (
      <div className="portfoliochart-container">
        <div className="portfoliochart-loading">Loading Portfolio Data...</div>
      </div>
    );
  }

  if (error)
    return (
      <div className="portfoliochart-container">
        <div className="portfoliochart-error">{error}</div>
      </div>
    );

  return (
    <div className="scale-wrapper">
      <div className="portfoliochart-container">
        <div className="portfoliochart-box">
          <div className="portfoliochart-buttons">
            {[
              { label: "30D", value: "30d" },
              { label: "6M", value: "6m" },
              { label: "1Y", value: "1y" },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => setRange(btn.value)}
                className={`portfoliochart-btn ${range === btn.value ? "active" : ""
                  }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="portfoliochart-graph">
            <Line options={options} data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}

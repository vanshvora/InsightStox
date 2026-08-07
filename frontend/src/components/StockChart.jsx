import React, { useEffect, useMemo, useState } from "react";
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
import "./StockChart.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function StockChart({ symbol, range: initialRange = "1Y", data: initialData }) {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Price",
        data: [],
        borderColor: "#00C853",
        borderWidth: 1.75,
        backgroundColor: "rgba(0, 200, 83, 0.15)",
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  });

  const [hiddenDates, setHiddenDates] = useState([]);
  const [range, setRange] = useState(initialRange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawDates, setRawDates] = useState([]);
  const [rawValues, setRawValues] = useState([]);

  axios.defaults.withCredentials = true;
  const BACKEND = import.meta.env.VITE_BACKEND_LINK;
  const API_URL = `${BACKEND}/dashboard/graph/?ticker=${symbol}`;

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      elements: { line: { borderWidth: 1.75 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0D0D0D",
          titleColor: "#00C853",
          borderWidth: 1,
          borderColor: "#00C853",
          displayColors: false,
          padding: 10,
          cornerRadius: 4,
          callbacks: {
            title: (ctx) => {
              const index = ctx[0].dataIndex;
              const iso = hiddenDates[index];
              const d = new Date(iso);
              return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            },
            label: (ctx) => `Price: ${ctx.parsed.y.toLocaleString()}`,
          },
        },
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          type: "category",
          ticks: {
            color: "#fff",
            autoSkip: range === "1M" || range === "3M",
            maxRotation: 0,
            minRotation: 0,
          },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#fff", callback: (v) => v.toLocaleString() },
          grid: { color: "#3F3F46" },
        },
      },
    };
  }, [hiddenDates, range]);

  const sliceByRange = (allDates, allValues) => {
    switch (range) {
      case "1M": return [allDates.slice(-30), allValues.slice(-30)];
      case "3M": return [allDates.slice(-90), allValues.slice(-90)];
      case "6M": return [allDates.slice(-180), allValues.slice(-180)];
      case "1Y": return [allDates.slice(-365), allValues.slice(-365)];
      default: return [allDates, allValues];
    }
  };

  useEffect(() => {
    if (initialData) {
      setRawDates(initialData.map(d => d.datetime));
      setRawValues(initialData.map(d => d.close));
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(API_URL, { params: { period: "1y" } });
        const payload = res.data || {};
        const x = payload.x || [];
        const y = payload.y || [];
        if (!x.length || !y.length) {
          setError("No chart data available for this stock.");
          return;
        }
        setRawDates(x);
        setRawValues(y);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch stock chart data.");
      } finally {
        setLoading(false);
      }
    };
    if (symbol) fetchData();
  }, [symbol, initialData]);

  useEffect(() => {
    if (rawDates.length === 0) return;

    const [filteredDates, filteredValues] = sliceByRange(rawDates, rawValues);
    setHiddenDates(filteredDates);

    const isUnsupportedRange = !["1M", "3M", "6M", "1Y"].includes(range);

    const labelFormat = isUnsupportedRange
      ? filteredDates // raw ISO labels
      : filteredDates.map((iso, index) => {
          const d = new Date(iso);
          if (range === "1M" || range === "3M")
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (range === "6M" || range === "1Y") {
            const curr = d.getMonth();
            const prev = filteredDates[index - 1];
            if (!prev) return d.toLocaleDateString("en-US", { month: "short" });
            const prevMonth = new Date(prev).getMonth();
            return curr !== prevMonth ? d.toLocaleDateString("en-US", { month: "short" }) : "";
          }
          return iso;
        });

    setChartData({
      labels: labelFormat,
      datasets: [
        {
          label: `${symbol.toUpperCase()} Price`,
          data: filteredValues,
          borderColor: "#00c853",
          backgroundColor: "rgba(34, 197, 94, 0.15)",
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    });
  }, [range, rawDates, rawValues]);

  if (loading) return <div className="stockchart-container">Loading chart...</div>;
  if (error) return <div className="stockchart-container error">{error}</div>;

  return (
    <div className="stockchart-container">
      <div className="stockchart-header">
        <h2>Chart</h2>
        <div className="stockchart-ranges">
          {["1M", "3M", "6M", "1Y"].map((r) => (
            <button
              key={r}
              className={`range-btn ${range === r ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="stockchart-graph">
        <Line data={chartData} options={options} data-testid="chart-line" />
      </div>
    </div>
  );
}

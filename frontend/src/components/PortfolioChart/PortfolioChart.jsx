import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

const RANGE_DAYS = {
  "30d": 30,
  "6m": 182,
  "1y": 365,
};

function toDateKey(value) {
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build a continuous daily series for the selected range.
 * Starts at the first real valuation - no zero-padding before it, so the
 * chart never fabricates a crash from 0 to the cumulative P&L.
 * Gaps after it forward-fill the last known value.
 */
function buildRangeSeries(daily, range) {
  const days = RANGE_DAYS[range] || 30;
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const byDate = new Map();
  for (const point of daily) {
    const key = toDateKey(point.date);
    if (!key) continue;
    byDate.set(key, Number(point.valuation) || 0);
  }

  const firstKey = [...byDate.keys()].sort()[0] || null;
  let start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  if (firstKey) {
    const first = new Date(firstKey);
    first.setHours(0, 0, 0, 0);
    if (first > start) start = first;
  }
  const series = [];
  let lastVal = 0;

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = toDateKey(cursor);
    if (byDate.has(key)) {
      lastVal = byDate.get(key);
    }
    // no zero-padding: gaps before the first real point are omitted,
    // after it we forward-fill the last known value
    if (!byDate.has(key) && (!firstKey || key < firstKey)) continue;
    series.push({ date: new Date(cursor).toISOString(), valuation: lastVal });
  }

  return series;
}

function buildLabels(sliced, range) {
  return sliced.map((d) => {
    const date = new Date(d.date);
    if (Number.isNaN(date.getTime())) return "";

    if (range === "30d") {
      const day = date.getDate();
      const monthShort = date.toLocaleDateString("en-US", { month: "short" });
      return day === 1 ? `${monthShort} 1` : String(day);
    }

    return date.getDate() === 1
      ? date.toLocaleDateString("en-US", { month: "short" })
      : "";
  });
}

function pointRadii(values) {
  return values.map((value, index) => {
    if (index === 0 || index === values.length - 1) return 4;
    return value !== values[index - 1] ? 4 : 0;
  });
}

export default function PortfolioChart() {
  const [range, setRange] = useState("30d");
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  axios.defaults.withCredentials = true;

  const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK;
  const VALUATION_API = `${BACKEND_URL}/dashboard/portfolio-valuation/`;

  const { data: daily = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ["portfolioChartData"],
    queryFn: async () => {
      const response = await axios.get(VALUATION_API, {
        params: { timePeriod: "1Y" },
      });
      const { data } = response.data || {};
      if (!data?.daily) throw new Error("Backend data missing.");

      return data.daily.map((d) => ({
        date: d.date,
        valuation: Number(d.valuation) || 0,
      }));
    },
    retry: 1,
  });

  const error = queryError
    ? queryError.response?.status === 401
      ? "Session expired. Please log in again."
      : "Failed to fetch portfolio performance data."
    : "";

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const sliced = useMemo(() => buildRangeSeries(daily, range), [daily, range]);
  const labels = useMemo(() => buildLabels(sliced, range), [sliced, range]);
  const values = useMemo(() => sliced.map((d) => d.valuation), [sliced]);
  const hiddenDates = useMemo(() => sliced.map((d) => d.date), [sliced]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Profit / Loss",
          data: values,
          borderColor: "#00c853",
          borderWidth: 2,
          backgroundColor: "rgba(0, 200, 83, 0.15)",
          tension: 0.25,
          fill: false,
          pointRadius: pointRadii(values),
          pointHoverRadius: 5,
          pointBackgroundColor: "#00c853",
          pointBorderColor: "#00c853",
        },
      ],
    }),
    [labels, values]
  );

  const options = useMemo(() => {
    const isNarrowDays = screenWidth < 900 && range === "30d";
    const maxTicks = isNarrowDays
      ? Math.max(3, Math.floor(screenWidth / 60))
      : undefined;

    const finiteValues = values.filter((v) => Number.isFinite(v));
    const minVal = finiteValues.length ? Math.min(...finiteValues) : 0;
    const maxVal = finiteValues.length ? Math.max(...finiteValues) : 100;
    const pad = Math.max(
      (maxVal - minVal) * 0.1,
      maxVal === minVal ? Math.max(maxVal * 0.05, 1) : 1
    );

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      elements: {
        line: { borderWidth: 2 },
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Profit / Loss History",
          color: "#00C853",
          font: { size: 22 },
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
          callbacks: {
            title: (context) => {
              const index = context[0]?.dataIndex;
              const iso = hiddenDates[index];
              const d = new Date(iso);
              if (Number.isNaN(d.getTime())) return "";
              return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            },
            label: (context) => {
              let label = context.dataset.label || "";
              if (label) label += ": ";
              if (context.parsed.y !== null && context.parsed.y !== undefined) {
                label += `₹${Number(context.parsed.y).toLocaleString()}`;
              }
              return label;
            },
          },
        },
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          type: "category",
          ticks: {
            color: "#fff",
            autoSkip: Boolean(isNarrowDays),
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
            lineWidth: (context) => (context.tick.label ? 1.2 : 0),
          },
        },
        y: {
          min: minVal - pad,
          max: maxVal + pad,
          ticks: {
            color: "#fff",
            callback: (v) => Number(v).toLocaleString(),
          },
          grid: { color: "#3F3F46" },
        },
      },
    };
  }, [range, hiddenDates, screenWidth, values]);

  useEffect(() => {
    if (!canvasRef.current || !sliced.length) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    chartRef.current = new ChartJS(canvasRef.current, {
      type: "line",
      data: chartData,
      options,
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData, options, sliced.length]);

  if (loading) {
    return (
      <div className="portfoliochart-container">
        <div className="portfoliochart-loading">Loading Portfolio Data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfoliochart-container">
        <div className="portfoliochart-error">{error}</div>
      </div>
    );
  }

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
                className={`portfoliochart-btn ${
                  range === btn.value ? "active" : ""
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="portfoliochart-graph">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

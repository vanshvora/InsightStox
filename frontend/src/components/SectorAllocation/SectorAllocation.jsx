import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './SectorAllocation.css';

//Chart.js setup
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Chart.js display options
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: 'Sector Allocation',
      color: '#F4F4F5',
      font: {
        size: 26,
        weight: 'bold',
        family: "'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
      },
      padding: { bottom: 30 },
    },
    legend: {
      position: 'bottom',
      labels: {
        color: '#A1A1AA',
        font: { size: 14 },
        padding: 20,
        boxWidth: 15,
        usePointStyle: true,
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: '#09090B',
      borderColor: '#00C853',
      borderWidth: 1,
      titleColor: '#F4F4F5',
      bodyColor: '#A1A1AA',
      padding: 10,
      cornerRadius: 4,
      callbacks: {
        label: (context) => {
          let label = context.label || '';
          if (label) label += ': ';
          if (context.parsed !== null) label += `${context.parsed}%`;
          return label;
        },
      },
    },
  },
  animation: {
    animateScale: true,
    animateRotate: true,
  },
};

// Color palette generator
const generateDynamicColors = (numColors) => {
  const colors = ['#22C55E', '#16A34A', '#15803D', '#4ADE80', '#86EFAC', '#14532D', '#166534'];
  return Array.from({ length: numColors }, (_, i) => colors[i % colors.length]);
};

// Format backend data for Chart.js
const formatDataForChart = (dataSet) => ({
  labels: dataSet.labels,
  datasets: [
    {
      label: '% Allocation',
      data: dataSet.values,
      backgroundColor: generateDynamicColors(dataSet.values.length),
      borderColor: '#18181B',
      borderWidth: 4,
      hoverOffset: 25,
      cutout: '60%',
    },
  ],
});

export default function SectorAllocationChart() {
  const [chartData, setChartData] = useState({ datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Always send cookies for authenticated users
  axios.defaults.withCredentials = true;

  // Dynamic backend URL
  const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK ;
  const ALLOCATION_API = `${BACKEND_URL}/dashboard/allocation/`;

  // Fetch sector allocation from backend
  const fetchAllocationData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(ALLOCATION_API);
      const apiData = response.data;

      if (!apiData.labels || !apiData.values) {
        throw new Error('Invalid data format received from backend');
      }

      setChartData(formatDataForChart(apiData));
    } catch (err) {
      console.error('Error fetching allocation data:', err);

      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to fetch allocation data from backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocationData();
  }, []);

  if (loading) return <div className="loading-container">Loading Allocation Data...</div>;

  if (error)
    return (
      <div className="sector-allocation-container">
        <p className="error-text">{error}</p>
      </div>
    );

  return (
    <div className="sector-allocation-container">
      <div className="chart-wrapper">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
}

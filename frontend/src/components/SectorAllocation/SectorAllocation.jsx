import React from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
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
  const BACKEND_URL = import.meta.env.VITE_BACKEND_LINK ;
  const ALLOCATION_API = `${BACKEND_URL}/dashboard/allocation/`;

  const { data: apiData, isLoading: loading, isError } = useQuery({
    queryKey: ['allocation'],
    queryFn: async () => {
      const response = await axios.get(ALLOCATION_API, { withCredentials: true });
      const data = response.data;
      if (!data.labels || !data.values) {
        throw new Error('Invalid data format received from backend');
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = apiData ? formatDataForChart(apiData) : { datasets: [] };

  if (loading) return <div className="loading-container">Loading Allocation Data...</div>;

  if (isError)
    return (
      <div className="sector-allocation-container">
        <p className="error-text">Failed to fetch allocation data from backend.</p>
      </div>
    );

  if (!apiData?.labels?.length)
    return (
      <div className="sector-allocation-container">
        <p className="error-text">No holdings to allocate yet.</p>
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


"use client";

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

const dummyChartData = {
  labels: Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
  datasets: [
    {
      label: 'Dummy Data',
      data: Array.from({ length: 10 }, (_, i) => i + 2),
      borderColor: 'hsl(var(--primary))',
      backgroundColor: 'hsla(var(--primary-hsl), 0.2)',
      tension: 0.1,
      fill: true,
      pointRadius: 0,
    },
  ],
};

const dummyChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Disable animation for performance testing
  scales: {
    x: {
      display: false, // Hide X-axis for simplicity
      ticks: {
        display: false,
      },
      grid: {
        display: false,
      }
    },
    y: {
      display: false, // Hide Y-axis for simplicity
       ticks: {
        display: false,
      },
      grid: {
        display: false,
      }
    },
  },
  plugins: {
    tooltip: {
      enabled: false, // Disable tooltips for performance
    },
    legend: {
      display: false, // Hide legend
    },
  },
  elements: {
    line: {
      borderWidth: 1.5,
    },
    point: {
      radius: 0,
      hoverRadius: 0,
    }
  },
  parsing: false, // Optimization if data is already parsed
  normalized: true, // Optimization if data is already normalized
};

interface DummyChartProps {
  // No props needed for this simple version
}

export default function DummyChart({}: DummyChartProps) {
  return <Line data={dummyChartData} options={dummyChartOptions} />;
}

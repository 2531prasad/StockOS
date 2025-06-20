
"use client";

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  // Tooltip, // Not registered if tooltips are disabled
  // Filler,  // Not registered if fill is false
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

const dummyChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], // Simple string labels
  datasets: [
    {
      label: 'Dataset 1',
      data: [10, 20, 15, 25, 30, 22], // Simple numerical data
      borderColor: 'rgb(255, 99, 132)', // Bright red
      backgroundColor: 'rgba(255, 99, 132, 0.5)', // Optional: for fill area if enabled
      borderWidth: 2, // Make line clearly visible
      // fill: false, // Default is false, let's keep it simple
      // tension: 0.1, // Smooth curve, let's use straight lines for simplicity
    },
  ],
};

const dummyChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false, // Important for fitting into various container sizes
  animation: false, // Disable animation for performance testing
  scales: {
    x: {
      display: true, // Temporarily display to confirm axis rendering
      ticks: {
        display: true,
         font: {
          size: 8,
        }
      },
      grid: {
        display: false,
      }
    },
    y: {
      display: true, // Temporarily display to confirm axis rendering
       ticks: {
        display: true,
         font: {
          size: 8,
        }
      },
      grid: {
        display: false,
      }
    },
  },
  plugins: {
    legend: {
      display: false, // Hide legend for simplicity
    },
    tooltip: {
      enabled: false, // Disable tooltips for performance
    },
  },
  elements: {
    point: {
      radius: 0, // Hide points on the line for a cleaner look
    },
    line: {
      // tension: 0 // Makes lines straight, tension: 0.1 was there before
    }
  },
  // Removed for simplicity, let Chart.js handle defaults:
  // parsing: false, 
  // normalized: true, 
};

interface DummyChartProps {
  // No props needed for this simple version
}

export default function DummyChart({}: DummyChartProps) {
  return <Line data={dummyChartData} options={dummyChartOptions} />;
}

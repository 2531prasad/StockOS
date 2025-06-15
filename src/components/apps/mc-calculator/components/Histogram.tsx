
"use client"; 
import React from 'react';
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Title // Import Title
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title); // Register Title

interface Props {
  data: { bin: number; count: number }[];
  title?: string;
}

export default function Histogram({ data, title = "Frequency Distribution" }: Props) {
  const labels = data.map(d => d.bin.toString()); // Ensure labels are strings
  const counts = data.map(d => d.count);

  const chartData = {
    labels,
    datasets: [{
      label: "Frequency",
      data: counts,
      backgroundColor: "hsl(var(--primary))", // Use theme color
      borderColor: "hsl(var(--primary-foreground))",
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Frequency Count'
        },
        grid: {
          color: 'hsl(var(--border))', // Theme border color
        },
        ticks: {
          color: 'hsl(var(--foreground))', // Theme foreground color
        },
      },
      x: {
        title: {
          display: true,
          text: 'Value Bins'
        },
        grid: {
          display: false, // Often cleaner for x-axis
        },
        ticks: {
          color: 'hsl(var(--foreground))', // Theme foreground color
          maxRotation: 45,
          minRotation: 0,
        },
      }
    },
    plugins: {
      tooltip: {
        mode: 'index' as const, // Cast to literal type
        intersect: false,
        callbacks: {
            label: function(context: any) { // Typing for context can be more specific
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += context.parsed.y;
                }
                return label;
            }
        }
      },
      title: { // Add title plugin configuration
        display: true,
        text: title,
        padding: {
          top: 10,
          bottom: 10
        },
        font: {
            size: 16
        },
        color: 'hsl(var(--foreground))'
      }
    }
  };

  // Ensure the chart has a non-zero height, e.g., by wrapping it or setting min-height
  return (
    <div style={{ height: '300px', width: '100%' }}> 
      <Bar data={chartData} options={options} />
    </div>
  );
}


"use client"; 
import React from 'react';
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Title
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title);

interface Props {
  data: { bin: number; count: number }[];
  title?: string;
}

export default function Histogram({ data, title = "Frequency Distribution" }: Props) {
  const labels = data.map(d => d.bin.toString());
  const counts = data.map(d => d.count);

  const chartData = {
    labels,
    datasets: [{
      label: "Frequency",
      data: counts,
      backgroundColor: "hsl(var(--primary))",
      borderColor: "hsl(var(--primary-foreground))",
      borderWidth: 1
    }]
  };

  const options = {
    indexAxis: 'y' as const, // Make the chart horizontal
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { // X-axis now represents Frequency Count
        beginAtZero: true,
        title: {
          display: true,
          text: 'Frequency Count' // Swapped title
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
        },
      },
      y: { // Y-axis now represents Value Bins
        title: {
          display: true,
          text: 'Value Bins' // Swapped title
        },
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          // No rotation needed for y-axis labels in horizontal typically
        },
      }
    },
    plugins: {
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
            label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                // For horizontal bar, parsed value is on x
                if (context.parsed.x !== null) { 
                    label += context.parsed.x;
                }
                return label;
            }
        }
      },
      title: {
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

  return (
    <div style={{ height: '300px', width: '100%' }}> 
      <Bar data={chartData} options={options} />
    </div>
  );
}

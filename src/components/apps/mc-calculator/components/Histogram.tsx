
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

interface HistogramEntry {
  label: string; // Bin range label e.g., "100-120"
  value: number; // Frequency count for that bin
  isMeanProximal: boolean;
}

interface Props {
  data: HistogramEntry[];
  title?: string;
}

export default function Histogram({ data, title = "Distribution" }: Props) {
  const chartLabels = data.map(d => d.label);
  const chartValues = data.map(d => d.value);
  const backgroundColors = data.map(d => d.isMeanProximal ? 'hsl(var(--accent))' : 'hsl(var(--primary))');
  const borderColors = data.map(d => d.isMeanProximal ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))');


  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: "Frequency", 
      data: chartValues,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 1
    }]
  };

  const options = {
    indexAxis: 'y' as const, 
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        beginAtZero: true, 
        title: {
          display: true,
          text: 'Frequency' 
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          precision: 0 // Ensure frequency ticks are whole numbers
        },
      },
      y: { 
        title: {
          display: true,
          text: 'Value Bins' 
        },
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--foreground))',
        },
      }
    },
    plugins: {
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
            title: function(tooltipItems: any) {
              return tooltipItems[0]?.label || ''; // Bin range e.g. "100-120"
            },
            label: function(context: any) {
                let label = context.dataset.label || ''; // "Frequency"
                if (label) {
                    label += ': ';
                }
                if (context.parsed.x !== null) { 
                    label += typeof context.parsed.x === 'number' ? context.parsed.x.toLocaleString() : context.parsed.x;
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

  // Sort data for display if indexAxis is 'y' to have higher frequencies potentially at top
  // Or, if bins are naturally ordered, it might be better to keep them that way.
  // The current stats.ts sorts by bin.lowerBound, so Y axis will be naturally ordered by value.
  
  return (
    <div style={{ height: '400px', width: '100%' }}> 
      <Bar data={chartData} options={options} />
    </div>
  );
}

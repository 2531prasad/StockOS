
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
import type { SigmaCategory } from '../utils/stats';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title);

interface HistogramEntry {
  label: string; // Bin range label e.g., "100-120"
  value: number; // PDF value for that bin
  sigmaCategory: SigmaCategory;
}

interface Props {
  data: HistogramEntry[];
  title?: string;
}

export default function Histogram({ data, title = "Distribution" }: Props) {
  const chartLabels = data.map(d => d.label);
  const chartValues = data.map(d => d.value);

  const getSigmaStyle = (category: SigmaCategory) => {
    switch (category) {
      case '1':
        return { bg: 'hsl(var(--sigma-1-bg))', border: 'hsl(var(--sigma-1-border))' };
      case '2':
        return { bg: 'hsl(var(--sigma-2-bg))', border: 'hsl(var(--sigma-2-border))' };
      case '3':
        return { bg: 'hsl(var(--sigma-3-bg))', border: 'hsl(var(--sigma-3-border))' };
      case 'other':
      default:
        return { bg: 'hsl(var(--sigma-other-bg))', border: 'hsl(var(--sigma-other-border))' };
    }
  };

  const backgroundColors = data.map(d => getSigmaStyle(d.sigmaCategory).bg);
  const borderColors = data.map(d => getSigmaStyle(d.sigmaCategory).border);


  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: "Probability Density", 
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
          text: 'Probability Density' 
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          // Consider formatting for PDF values if they become very small
           callback: function(value: string | number) {
            if (typeof value === 'number') {
              return value.toPrecision(2); // Adjust precision as needed
            }
            return value;
          }
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
                let label = context.dataset.label || ''; // "Probability Density"
                if (label) {
                    label += ': ';
                }
                if (context.parsed.x !== null) { 
                    const val = context.parsed.x;
                    label += typeof val === 'number' ? val.toPrecision(4) : val; // More precision for tooltip
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
    <div style={{ height: '400px', width: '100%' }}> 
      <Bar data={chartData} options={options} />
    </div>
  );
}

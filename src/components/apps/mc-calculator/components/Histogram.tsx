
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
  label: string;
  value: number;
  originalPercentile: number;
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
      label: "Value at Percentile", // Updated dataset label
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
        beginAtZero: false, // Values can be negative, so don't force start at zero
        title: {
          display: true,
          text: 'Value' // X-axis represents the actual calculated values
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          callback: function(value: any) { // Format ticks for better readability if large numbers
            if (typeof value === 'number') {
              return value.toLocaleString();
            }
            return value;
          }
        },
      },
      y: { 
        title: {
          display: true,
          text: 'Percentiles' // Y-axis lists the percentile labels
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
              // tooltipItems[0].label is already formatted "P% | V"
              // We can just return that or extract parts if needed
              return tooltipItems[0]?.label || '';
            },
            label: function(context: any) {
                let label = context.dataset.label || ''; // "Value at Percentile"
                if (label) {
                    label += ': ';
                }
                if (context.parsed.x !== null) { 
                    label += typeof context.parsed.x === 'number' ? context.parsed.x.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:2}) : context.parsed.x;
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
    <div style={{ height: '400px', width: '100%' }}> {/* Increased height for more bars */}
      <Bar data={chartData} options={options} />
    </div>
  );
}

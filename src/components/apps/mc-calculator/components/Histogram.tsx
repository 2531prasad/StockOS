
"use client"; 
import React from 'react';
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Title,
  type ChartOptions,
  type ChartData
} from "chart.js";
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, annotationPlugin);

interface HistogramEntry {
  label: string; 
  probability: number; 
  lowerBound: number; // Still useful for context if needed, though not directly for bar value
  upperBound: number;
}

interface Props {
  data: HistogramEntry[];
  title?: string;
  meanValue?: number;
  stdDevValue?: number; // Changed from medianValue
}

export default function Histogram({ 
  data, 
  title = "Distribution", 
  meanValue,
  stdDevValue 
}: Props) {

  const formatNumberForLabel = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    // Show more precision for mean/std dev lines
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const chartData: ChartData<'bar'> = {
    labels: data.map(d => d.label), 
    datasets: [{
      label: "Probability", 
      data: data.map(entry => entry.probability),
      backgroundColor: 'hsl(var(--primary))',
      borderColor: 'hsl(var(--primary-foreground))',
      borderWidth: 1,
    }]
  };

  const annotationsConfig: any = {};
  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    annotationsConfig.meanLine = {
      type: 'line',
      scaleID: 'x', 
      value: meanValue,
      borderColor: 'hsl(var(--accent))', // Using accent for mean line
      borderWidth: 2,
      label: {
        enabled: true,
        content: `μ: ${formatNumberForLabel(meanValue)}`,
        position: 'top',
        backgroundColor: 'hsla(var(--background), 0.75)',
        color: 'hsl(var(--accent-foreground))',
        font: { weight: 'bold' },
        yAdjust: -5,
      }
    };

    if (typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
      const sigmas = [-3, -2, -1, 1, 2, 3];
      // Using a more distinct set of colors for sigma lines, can be themed later
      const sigmaLineColors = [
        '#FF6384', // -3σ (Reddish)
        '#FF9F40', // -2σ (Orange)
        '#FFCD56', // -1σ (Yellow)
        '#4BC0C0', // +1σ (Teal)
        '#36A2EB', // +2σ (Blue)
        '#9966FF', // +3σ (Purple)
      ];

      sigmas.forEach((s, index) => {
        const sigmaVal = meanValue + s * stdDevValue;
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaVal,
          borderColor: sigmaLineColors[index],
          borderWidth: 1,
          borderDash: [5, 5],
          label: {
            enabled: true,
            content: `${s > 0 ? '+' : ''}${s}σ`,
            position: s < 0 ? 'bottom' : 'top',
            backgroundColor: 'hsla(var(--background), 0.6)',
            color: sigmaLineColors[index],
            font: { size: 10, weight: 'normal' },
            yAdjust: s < 0 ? 5 : -5,
            xAdjust: s === -3 ? 10 : (s === 3 ? -10 : 0) // Prevent label overlap at edges
          }
        };
      });
    }
  }
  
  const options: ChartOptions<'bar'> = { 
    indexAxis: 'x' as const, // Vertical bar chart
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        title: {
          display: true,
          text: 'Value Bins' 
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
          maxTicksLimit: data.length > 20 ? Math.floor(data.length / 2) : data.length, // Reduce ticks if too many bins
        },
      },
      y: { 
        beginAtZero: true,
        title: {
          display: true,
          text: 'Probability' 
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
           callback: function(value: string | number) {
            if (typeof value === 'number') {
              return (value * 100).toFixed(0) + '%'; // Format probability as percentage
            }
            return value;
          }
        },
      }
    },
    plugins: {
      annotation: {
        annotations: annotationsConfig,
        drawTime: 'afterDatasetsDraw' // Draw annotations on top of bars
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
            title: function(tooltipItems: any) {
              const dataIndex = tooltipItems[0]?.dataIndex;
              if (dataIndex !== undefined && data[dataIndex]) {
                return `Bin: ${data[dataIndex].label}`; 
              }
              return '';
            },
            label: function(context: any) {
                let label = context.dataset.label || ''; 
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) { 
                    const probability = context.parsed.y;
                    label += (probability * 100).toFixed(2) + '%';
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
          bottom: 20 
        },
        font: {
            size: 16
        },
        color: 'hsl(var(--foreground))'
      }
    }
  };
  
  return (
    <div style={{ height: '450px', width: '100%' }}> 
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}

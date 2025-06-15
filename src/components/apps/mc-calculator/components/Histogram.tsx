
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
  lowerBound: number; 
  upperBound: number;
}

interface Props {
  data: HistogramEntry[];
  title?: string;
  meanValue?: number;
  stdDevValue?: number; 
}

export default function Histogram({ 
  data, 
  title = "Distribution", 
  meanValue,
  stdDevValue 
}: Props) {

  const formatNumberForLabel = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const chartData: ChartData<'bar'> = {
    labels: data.map(d => d.label), 
    datasets: [{
      label: "Probability", 
      data: data.map(entry => entry.probability),
      backgroundColor: `hsl(var(--primary))`,
      borderColor: `hsl(var(--primary-foreground))`,
      borderWidth: 1,
    }]
  };

  const annotationsConfig: any = {};
  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    annotationsConfig.meanLine = {
      type: 'line',
      scaleID: 'x', 
      value: meanValue,
      borderColor: `hsl(var(--accent))`, 
      borderWidth: 2,
      label: {
        enabled: true,
        content: `μ: ${formatNumberForLabel(meanValue)}`,
        position: 'top',
        backgroundColor: 'hsla(var(--background), 0.75)',
        color: `hsl(var(--accent-foreground))`,
        font: { weight: 'bold' },
        yAdjust: -5,
      }
    };

    if (typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
      const sigmas = [-3, -2, -1, 1, 2, 3];
      // Explicitly define colors for sigma lines, can be HSL or hex
      const sigmaLineColors = [
        'hsl(var(--chart-1))', // Example: use chart-1 for -3sigma
        'hsl(var(--chart-2))', // Example: use chart-2 for -2sigma
        'hsl(var(--chart-3))', // Example: use chart-3 for -1sigma
        'hsl(var(--chart-4))', // Example: use chart-4 for +1sigma
        'hsl(var(--chart-5))', // Example: use chart-5 for +2sigma
        'hsl(var(--destructive))', // Example: use destructive for +3sigma (or another chart color)
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
            xAdjust: s === -3 ? 10 : (s === 3 ? -10 : 0) 
          }
        };
      });
    }
  }
  
  const options: ChartOptions<'bar'> = { 
    indexAxis: 'x' as const, 
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { 
        title: {
          display: true,
          text: 'Value Bins',
          color: `hsl(var(--foreground))`
        },
        grid: {
          color: `hsl(var(--border))`,
        },
        ticks: {
          color: `hsl(var(--foreground))`,
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
          maxTicksLimit: data.length > 20 ? Math.floor(data.length / 2) : data.length,
        },
      },
      y: { 
        beginAtZero: true,
        title: {
          display: true,
          text: 'Probability',
          color: `hsl(var(--foreground))`
        },
        grid: {
          color: `hsl(var(--border))`,
        },
        ticks: {
          color: `hsl(var(--foreground))`,
           callback: function(value: string | number) {
            if (typeof value === 'number') {
              return (value * 100).toFixed(0) + '%'; 
            }
            return value;
          }
        },
      }
    },
    plugins: {
      annotation: {
        annotations: annotationsConfig,
        drawTime: 'afterDatasetsDraw' 
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: `hsl(var(--card))`,
        titleColor: `hsl(var(--card-foreground))`,
        bodyColor: `hsl(var(--card-foreground))`,
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
        color: `hsl(var(--foreground))`
      }
    }
  };
  
  return (
    <div style={{ height: '450px', width: '100%' }}> 
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}


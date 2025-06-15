
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
  type ChartOptions // Import ChartOptions
} from "chart.js";
import annotationPlugin from 'chartjs-plugin-annotation';
import type { SigmaCategory } from '../utils/stats';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, annotationPlugin);

interface HistogramEntry {
  label: string; // Bin range label e.g., "100-120"
  value: number; // PDF value for that bin
  sigmaCategory: SigmaCategory;
  lowerBound: number;
  upperBound: number;
}

interface Props {
  data: HistogramEntry[];
  title?: string;
  meanValue?: number;
  medianValue?: number;
  yScaleMin?: number;
  yScaleMax?: number;
}

export default function Histogram({ 
  data, 
  title = "Distribution", 
  meanValue, 
  medianValue,
  yScaleMin,
  yScaleMax 
}: Props) {

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
  
  const formatNumberForLabel = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };


  const chartData = {
    // Labels are not directly used for y-axis scale with linear type, but good for context
    // labels: data.map(d => d.label), 
    datasets: [{
      label: "Probability Density", 
      data: data.map(entry => ({
        x: entry.value, // PDF value for bar length
        y: [entry.lowerBound, entry.upperBound] as [number, number] // Floating bar for Y-axis
      })),
      backgroundColor: data.map(d => getSigmaStyle(d.sigmaCategory).bg),
      borderColor: data.map(d => getSigmaStyle(d.sigmaCategory).border),
      borderWidth: 1,
      borderSkipped: false, // Important for floating bars to render full borders
    }]
  };

  const annotationsConfig: any = {};
  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    annotationsConfig.meanLine = {
      type: 'line',
      scaleID: 'y',
      value: meanValue,
      borderColor: 'hsl(var(--primary))',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: `Mean: ${formatNumberForLabel(meanValue)}`,
        position: 'end',
        backgroundColor: 'hsla(var(--background), 0.75)',
        color: 'hsl(var(--primary-foreground))',
         font: {
          weight: 'bold'
        },
        padding: 3,
        yAdjust: -10,
      }
    };
  }
  if (typeof medianValue === 'number' && !isNaN(medianValue)) {
    annotationsConfig.medianLine = {
      type: 'line',
      scaleID: 'y',
      value: medianValue,
      borderColor: 'hsl(var(--accent))',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: `Median: ${formatNumberForLabel(medianValue)}`,
        position: 'start',
        backgroundColor: 'hsla(var(--background), 0.75)',
        color: 'hsl(var(--accent-foreground))',
         font: {
          weight: 'bold'
        },
        padding: 3,
        yAdjust: 10,
      }
    };
  }

  const options: ChartOptions<'bar'> = { // Explicitly type ChartOptions
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
           callback: function(value: string | number) {
            if (typeof value === 'number') {
              return value.toPrecision(2); 
            }
            return value;
          }
        },
      },
      y: { 
        type: 'linear', // Y-axis is now linear
        min: typeof yScaleMin === 'number' && !isNaN(yScaleMin) ? yScaleMin : undefined,
        max: typeof yScaleMax === 'number' && !isNaN(yScaleMax) ? yScaleMax : undefined,
        title: {
          display: true,
          text: 'Value' // Changed from "Value Bins"
        },
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          // Consider adding a callback here if you want to format y-axis numbers
        },
      }
    },
    plugins: {
      annotation: {
        annotations: annotationsConfig
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
            title: function(tooltipItems: any) {
              // For floating bars, tooltipItems[0].label is usually the parsed y value or range.
              // We can use dataIndex to get our original bin label.
              const dataIndex = tooltipItems[0]?.dataIndex;
              if (dataIndex !== undefined && data[dataIndex]) {
                return data[dataIndex].label; // Bin range e.g. "100-120"
              }
              return '';
            },
            label: function(context: any) {
                let label = context.dataset.label || ''; // "Probability Density"
                if (label) {
                    label += ': ';
                }
                if (context.parsed.x !== null) { 
                    const val = context.parsed.x;
                    label += typeof val === 'number' ? val.toPrecision(4) : val; 
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
          bottom: 30 // Added more padding to avoid overlap with annotation labels
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
      {/* Ensure data has loaded before rendering chart to prevent errors with empty/undefined structures */}
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p>Loading chart data...</p>}
    </div>
  );
}

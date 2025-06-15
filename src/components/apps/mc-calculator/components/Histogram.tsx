
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
        x: entry.value, // PDF value for bar length (horizontal axis)
        y: [entry.lowerBound, entry.upperBound] as [number, number] // Floating bar for Y-axis (vertical axis for values)
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
      scaleID: 'y', // Annotation on the Y-axis (Value axis)
      value: meanValue,
      borderColor: 'hsl(var(--primary))',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: `Mean: ${formatNumberForLabel(meanValue)}`,
        position: 'end',
        backgroundColor: 'hsla(var(--background), 0.75)',
        color: 'hsl(var(--primary-foreground))', // Using primary-foreground for text on primary line's label
         font: {
          weight: 'bold'
        },
        padding: 3,
        yAdjust: -10, // Adjust label position relative to the line
      }
    };
  }
  if (typeof medianValue === 'number' && !isNaN(medianValue)) {
    annotationsConfig.medianLine = {
      type: 'line',
      scaleID: 'y', // Annotation on the Y-axis (Value axis)
      value: medianValue,
      borderColor: 'hsl(var(--accent))',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: `Median: ${formatNumberForLabel(medianValue)}`,
        position: 'start', // Position label at the start of the line
        backgroundColor: 'hsla(var(--background), 0.75)',
        color: 'hsl(var(--accent-foreground))', // Using accent-foreground for text on accent line's label
         font: {
          weight: 'bold'
        },
        padding: 3,
        yAdjust: 10, // Adjust label position relative to the line
      }
    };
  }

  const options: ChartOptions<'bar'> = { // Explicitly type ChartOptions
    indexAxis: 'y' as const, // Horizontal bar chart: Y-axis for categories (our value bins), X-axis for values (PDF)
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { // This is the horizontal axis (bar length)
        beginAtZero: true, 
        title: {
          display: true,
          text: 'Probability Density' // Label for the X-axis
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
           callback: function(value: string | number) { // Ensure type safety for value
            if (typeof value === 'number') {
              return value.toPrecision(2); // Format PDF values
            }
            return value;
          }
        },
      },
      y: { // This is the vertical axis (categories, i.e., our value bins/ranges)
        type: 'linear', // Y-axis is now linear for floating bars and annotations
        min: typeof yScaleMin === 'number' && !isNaN(yScaleMin) ? yScaleMin : undefined,
        max: typeof yScaleMax === 'number' && !isNaN(yScaleMax) ? yScaleMax : undefined,
        title: {
          display: true,
          text: 'Value' // Label for the Y-axis
        },
        grid: {
          display: false, // Hide grid lines on Y-axis for cleaner look with floating bars
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          // Consider adding a callback here if you want to format y-axis numbers (e.g. large numbers)
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
                if (context.parsed.x !== null) { // context.parsed.x is the PDF value
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


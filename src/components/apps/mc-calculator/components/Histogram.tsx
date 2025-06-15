
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
  type ChartData,
  type ScriptableContext,
  type Tick,
  type PluginOptionsByType,
} from "chart.js";
import annotationPlugin, { type AnnotationOptions, type AnnotationPluginOptions } from 'chartjs-plugin-annotation';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, annotationPlugin);

export interface HistogramEntry {
  label: string; // e.g., "100.0-110.0"
  probability: number;
  lowerBound: number;
  upperBound: number;
  binCenter: number;
  sigmaCategory: '1' | '2' | '3' | 'other';
}

interface Props {
  data: HistogramEntry[];
  title?: string;
  meanValue?: number;
  medianValue?: number;
  stdDevValue?: number;
}

// Helper to format numbers for labels - keeping it concise
const formatNumberForLabel = (num: number | undefined, digits: number = 1): string => {
  if (num === undefined || isNaN(num)) return "N/A";
  if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(1);
  if (Math.abs(num) >= 10000 || (Math.abs(num) < 0.1 && num !== 0)) {
     return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) });
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// Find the index of the bin that a given value falls into
const findBinIndexForValue = (value: number, data: HistogramEntry[]): number => {
    if (!data || data.length === 0 || isNaN(value)) return -1;

    // Check edges first
    if (value <= data[0].upperBound && value >= data[0].lowerBound) return 0;
    if (value >= data[data.length - 1].lowerBound && value <= data[data.length-1].upperBound) return data.length - 1;

    // Check intermediate bins
    for (let i = 0; i < data.length; i++) {
        if (i < data.length - 1) { // For all but the last bin, upper bound is exclusive
            if (value >= data[i].lowerBound && value < data[i].upperBound) {
                return i;
            }
        } else { // For the last bin, upper bound is inclusive
            if (value >= data[i].lowerBound && value <= data[i].upperBound) {
                return i;
            }
        }
    }
    // If value is outside the range of all bins
    if (value < data[0].lowerBound) return 0; // Snap to first bin if below range
    if (value > data[data.length - 1].upperBound) return data.length - 1; // Snap to last bin if above range

    return -1; // Should not be reached if data is valid
};


export default function Histogram({
  data,
  title = "Distribution",
  meanValue,
  medianValue,
  stdDevValue,
}: Props) {

  // DIAGNOSTIC: Hardcoded colors
  const getBarColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
    if (!sigmaCategory) return 'hsl(0, 0%, 80%)'; // Default gray for 'other' or undefined

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 50%)'; // Cyan
      case '2': return 'hsl(120, 60%, 50%)'; // Green
      case '3': return 'hsl(60, 85%, 50%)';  // Yellow
      default: return 'hsl(0, 0%, 80%)';    // Light Gray for 'other'
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
    if (!sigmaCategory) return 'hsl(0, 0%, 70%)';

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 40%)';
      case '2': return 'hsl(120, 60%, 40%)';
      case '3': return 'hsl(60, 85%, 40%)';
      default: return 'hsl(0, 0%, 70%)';
    }
  };

  const chartData: ChartData<'bar'> = {
    labels: data.map(entry => entry.label),
    datasets: [{
      label: "Probability",
      data: data.map(entry => entry.probability),
      backgroundColor: getBarColor,
      borderColor: getBorderColor,
      borderWidth: 1,
      barPercentage: 1.0, // Ensure bars touch for histogram feel
      categoryPercentage: 1.0, // Ensure bars touch
    }]
  };

  const annotationsConfig: Record<string, AnnotationOptions> = {};

  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    const meanBinIndex = findBinIndexForValue(meanValue, data);
    if (meanBinIndex !== -1) {
      annotationsConfig.meanLine = {
        type: 'line',
        scaleID: 'x', // Annotate on the x-axis (categories/bins)
        value: meanBinIndex, // The index of the bin
        borderColor: 'red', // DIAGNOSTIC
        borderWidth: 2,
        label: {
          enabled: true,
          content: `Mean: ${formatNumberForLabel(meanValue)}`,
          position: 'top',
          backgroundColor: 'rgba(255,255,255,0.8)', // DIAGNOSTIC
          color: 'black', // DIAGNOSTIC
          font: { weight: 'bold' },
          yAdjust: -5, // Adjust label position
        }
      };
    }
  }

  if (typeof medianValue === 'number' && !isNaN(medianValue)) {
    const medianBinIndex = findBinIndexForValue(medianValue, data);
     if (medianBinIndex !== -1) {
        annotationsConfig.medianLine = {
          type: 'line',
          scaleID: 'x',
          value: medianBinIndex,
          borderColor: 'blue', // DIAGNOSTIC
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            enabled: true,
            content: `Median: ${formatNumberForLabel(medianValue)}`,
            position: 'bottom', // Position below the line
            backgroundColor: 'rgba(255,255,255,0.8)', // DIAGNOSTIC
            color: 'black', // DIAGNOSTIC
            font: { weight: 'bold' },
            yAdjust: 5, // Adjust label position
          }
        };
    }
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    const sigmaLineColors = ['darkgrey', 'grey', 'lightgrey', 'lightgrey', 'grey', 'darkgrey']; // DIAGNOSTIC

    sigmas.forEach((s, idx) => {
      const sigmaVal = meanValue + s * stdDevValue;
      const sigmaBinIndex = findBinIndexForValue(sigmaVal, data);
      if (sigmaBinIndex !== -1) {
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaBinIndex,
          borderColor: sigmaLineColors[idx], // DIAGNOSTIC
          borderWidth: 1,
          borderDash: [2, 2],
          label: {
            enabled: true,
            content: `${s > 0 ? '+' : ''}${s}σ (${formatNumberForLabel(sigmaVal,1)})`,
            position: s < 0 ? 'start' : 'end',
            rotation: 90,
            backgroundColor: 'rgba(255,255,255,0.7)', // DIAGNOSTIC
            color: 'black', // DIAGNOSTIC
            font: { size: 10 },
            yAdjust: s < 0 ? -15 : 15, // Adjust based on side
          }
        };
      }
    });
  }

  const options: ChartOptions<'bar'> & PluginOptionsByType<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category', // X-axis is categorical (bins)
        title: {
          display: true,
          text: 'Value Bins',
          color: 'hsl(var(--foreground))'
        },
        grid: {
          color: 'hsl(var(--border))',
          display: false, // Hide grid lines for x-axis if desired
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          maxRotation: 45, // Rotate labels if they overlap
          minRotation: 30,
          autoSkip: true, // Automatically skip labels to prevent overlap
          // callback will show all labels by default for categorical axis
        },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Probability',
          color: 'hsl(var(--foreground))'
        },
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          // Format ticks as percentages
          callback: function(value: string | number, index: number, ticks_arr: Tick[]) {
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
        drawTime: 'afterDatasetsDraw' // Draw annotations on top of data
      } as AnnotationPluginOptions, // Cast to satisfy stricter type checking
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'hsl(var(--card))', // Use card background for tooltip
        titleColor: 'hsl(var(--card-foreground))', // Use card text color
        bodyColor: 'hsl(var(--card-foreground))', // Use card text color
        callbacks: {
          title: function(tooltipItems: any) {
            // The tooltipItem's label is the bin label (e.g., "100-110")
            return `Bin: ${tooltipItems[0].label}`;
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
        color: 'hsl(var(--foreground))' // Use foreground text color
      }
    }
  };

  return (
    <div style={{ height: '450px', width: '100%' }}> {/* Ensure chart has dimensions */}
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}

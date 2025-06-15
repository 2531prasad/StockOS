
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
  type PluginOptionsByType,
  type ScriptableContext,
  type Tick,
} from "chart.js";
import annotationPlugin, { type AnnotationOptions, type AnnotationPluginOptions } from 'chartjs-plugin-annotation';
import { getPercentile } from "../utils/stats"; // Import getPercentile

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
  simulationResults?: number[]; // Raw simulation data for percentile calculations
  title?: string;
  meanValue?: number;
  medianValue?: number;
  stdDevValue?: number;
}

// Helper function to generate percentile steps
function getEvenPercentileSteps(binCount: number): number[] {
  if (binCount <= 0) return [];
  if (binCount === 1) return [50]; // Single bar, show median percentile

  const startPercentile = 5;
  const endPercentile = 95;
  // For binCount items, there are binCount - 1 intervals.
  const step = (endPercentile - startPercentile) / (binCount - 1);

  return Array.from({ length: binCount }, (_, i) => {
    const pVal = startPercentile + i * step;
    return parseFloat(pVal.toFixed(2));
  });
}


const findBinIndexForValue = (value: number, dataValues: number[]): number => {
    if (!dataValues || dataValues.length === 0 || isNaN(value)) return -1;

    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < dataValues.length; i++) {
        if (isNaN(dataValues[i])) continue;
        const diff = Math.abs(dataValues[i] - value);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }
    return closestIndex;
};


export default function Histogram({
  data,
  simulationResults,
  title = "Distribution",
  meanValue,
  medianValue,
  stdDevValue,
}: Props) {

  const formatNumberForLabel = (num: number | undefined, digits: number = 2): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  const numBars = data.length;
  const percentilePoints = getEvenPercentileSteps(numBars);
  
  const safeSimulationResults = simulationResults && simulationResults.length > 0 ? simulationResults : [];

  const xAxisDataPoints = percentilePoints.map(p => {
    if (safeSimulationResults.length === 0) return p; // Fallback if no results, unlikely but safe
    return parseFloat(getPercentile(safeSimulationResults, p).toFixed(2));
  }).filter(v => !isNaN(v));
  
  // Ensure data for the dataset matches the number of actual x-axis points calculated
  const probabilities = data.slice(0, xAxisDataPoints.length).map(entry => entry.probability);
  const sigmaCategoriesForBars = data.slice(0, xAxisDataPoints.length).map(entry => entry.sigmaCategory);


  const getBarColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = sigmaCategoriesForBars[index];
    if (!sigmaCategory) return 'hsl(var(--sigma-other-bg))';

    switch (sigmaCategory) {
      case '1': return 'hsl(var(--sigma-1-bg))';
      case '2': return 'hsl(var(--sigma-2-bg))';
      case '3': return 'hsl(var(--sigma-3-bg))';
      default: return 'hsl(var(--sigma-other-bg))';
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = sigmaCategoriesForBars[index];
     if (!sigmaCategory) return 'hsl(var(--sigma-other-border))';

    switch (sigmaCategory) {
      case '1': return 'hsl(var(--sigma-1-border))';
      case '2': return 'hsl(var(--sigma-2-border))';
      case '3': return 'hsl(var(--sigma-3-border))';
      default: return 'hsl(var(--sigma-other-border))';
    }
  };

  const chartData: ChartData<'bar'> = {
    labels: xAxisDataPoints, // Numeric X-coordinates for a linear axis
    datasets: [{
      label: "Probability",
      data: probabilities, // Y-values (probabilities)
      backgroundColor: getBarColor,
      borderColor: getBorderColor,
      borderWidth: 1,
      barPercentage: 1.0, // Adjust for potentially non-uniform spacing if needed
      categoryPercentage: 1.0, // Adjust for potentially non-uniform spacing
    }]
  };

  const annotationsConfig: Record<string, AnnotationOptions> = {};

  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    annotationsConfig.meanLine = {
      type: 'line',
      scaleID: 'x',
      value: meanValue,
      borderColor: 'hsl(var(--destructive))', // Using destructive for high visibility
      borderWidth: 2,
      label: {
        enabled: true,
        content: `Mean: ${formatNumberForLabel(meanValue)}`,
        position: 'top',
        backgroundColor: 'hsla(var(--card), 0.7)',
        color: 'hsl(var(--destructive-foreground))',
        font: { weight: 'bold' },
        yAdjust: -5,
      }
    };
  }

  if (typeof medianValue === 'number' && !isNaN(medianValue)) {
    annotationsConfig.medianLine = {
      type: 'line',
      scaleID: 'x',
      value: medianValue,
      borderColor: 'hsl(var(--primary))', // Using primary for median
      borderWidth: 2,
      borderDash: [6, 6],
      label: {
        enabled: true,
        content: `Median: ${formatNumberForLabel(medianValue)}`,
        position: 'bottom',
        backgroundColor: 'hsla(var(--card), 0.7)',
        color: 'hsl(var(--primary-foreground))',
        font: { weight: 'bold' },
        yAdjust: 5,
      }
    };
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    // Using a muted color for sigma lines to avoid clutter
    const sigmaLineColor = 'hsl(var(--muted-foreground))'; 
    const sigmaLabelBackgroundColor = 'hsla(var(--background), 0.7)';


    sigmas.forEach((s) => {
      const sigmaVal = meanValue + s * stdDevValue;
      // For a linear X-axis, the value is directly sigmaVal
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaVal,
          borderColor: sigmaLineColor,
          borderWidth: 1,
          borderDash: [2, 2],
          label: {
            enabled: true,
            content: `${s > 0 ? '+' : ''}${s}σ (${formatNumberForLabel(sigmaVal,1)})`,
            position: s < 0 ? 'start' : 'end',
            rotation: 90,
            backgroundColor: sigmaLabelBackgroundColor,
            color: sigmaLineColor,
            font: { size: 10 },
            yAdjust: s < 0 ? -15 : 15, // Adjusted for vertical text
          }
        };
    });
  }

  const options: ChartOptions<'bar'> & PluginOptionsByType<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear', // X-axis is now linear
        title: {
          display: true,
          text: 'Value (at Percentiles)',
          color: `hsl(var(--foreground))`
        },
        grid: {
          color: `hsl(var(--border))`,
          display: false,
        },
        ticks: {
          color: `hsl(var(--foreground))`,
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
          // Chart.js will auto-generate ticks on the linear scale.
          // Bars are positioned at xAxisDataPoints, ticks might differ.
          callback: function(value: string | number, index: number, ticks: Tick[]) {
            if (typeof value === 'number') {
              return formatNumberForLabel(value, 1);
            }
            return value;
          }
        },
      },
      y: {
        type: 'linear',
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
          callback: function(value: string | number, index: number, ticks: Tick[]) {
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
      } as AnnotationPluginOptions,
      tooltip: {
        mode: 'index' as const, // Might need 'nearest' with linear X for better UX
        intersect: false,
        backgroundColor: `hsl(var(--card))`,
        titleColor: `hsl(var(--card-foreground))`,
        bodyColor: `hsl(var(--card-foreground))`,
        callbacks: {
          title: function(tooltipItems: any) {
            const dataIndex = tooltipItems[0]?.dataIndex;
            // Since X-axis is linear, tooltipItems[0].label might be the numeric x-value
            // or we can use props.data[dataIndex].label for the original bin range.
            if (dataIndex !== undefined && data[dataIndex]) {
              return `Bin: ${data[dataIndex].label}\n(Percentile X-value: ${formatNumberForLabel(xAxisDataPoints[dataIndex])})`;
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
      {data && data.length > 0 && xAxisDataPoints.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}

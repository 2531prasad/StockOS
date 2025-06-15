
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
  type PluginOptionsByType, // Import this
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

const formatNumberForLabel = (num: number | undefined, digits: number = 2): string => {
  if (num === undefined || isNaN(num)) return "N/A";
  if (Math.abs(num) < 0.01 && num !== 0 && (Math.abs(num) < 0.0001 || Math.abs(num) > 1e-5 )) return num.toExponential(1);
  if (Math.abs(num) >= 10000 || (Math.abs(num) < 0.1 && num !== 0)) {
    return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 3) });
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// Helper to find the index of the bin that a given value falls into
const findBinIndexForValue = (value: number, data: HistogramEntry[]): number => {
    if (!data || data.length === 0 || isNaN(value)) return -1;

    // Check if the value is within the range of the first bin
    if (value <= data[0].upperBound && value >= data[0].lowerBound) return 0;
    // Check if the value is within the range of the last bin
    if (value >= data[data.length - 1].lowerBound && value <= data[data.length-1].upperBound) return data.length - 1;

    for (let i = 0; i < data.length; i++) {
        // For all bins except the last, check if value is >= lowerBound and < upperBound
        if (i < data.length - 1) {
            if (value >= data[i].lowerBound && value < data[i].upperBound) {
                return i;
            }
        } else { // For the last bin, include its upperBound
            if (value >= data[i].lowerBound && value <= data[i].upperBound) {
                return i;
            }
        }
    }
    // If value is less than the first bin's lower bound
    if (value < data[0].lowerBound) return 0;
    // If value is greater than the last bin's upper bound
    if (value > data[data.length - 1].upperBound) return data.length - 1;

    return -1; // Should not be reached if logic is correct and data covers the range
};


export default function Histogram({
  data,
  title = "Distribution",
  meanValue,
  medianValue,
  stdDevValue,
}: Props) {

  const getBarColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
    if (!sigmaCategory) return 'hsl(0, 0%, 88%)'; // Fallback: --sigma-other-bg

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 60%)'; // --sigma-1-bg
      case '2': return 'hsl(120, 60%, 55%)'; // --sigma-2-bg
      case '3': return 'hsl(55, 85%, 60%)';  // --sigma-3-bg
      default: return 'hsl(0, 0%, 88%)';   // --sigma-other-bg
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
     if (!sigmaCategory) return 'hsl(0, 0%, 75%)'; // Fallback: --sigma-other-border

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 45%)'; // --sigma-1-border
      case '2': return 'hsl(120, 60%, 40%)'; // --sigma-2-border
      case '3': return 'hsl(55, 85%, 45%)';  // --sigma-3-border
      default: return 'hsl(0, 0%, 75%)';   // --sigma-other-border
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
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    }]
  };

  const annotationsConfig: Record<string, AnnotationOptions> = {};

  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    const meanBinIndex = findBinIndexForValue(meanValue, data);
    if (meanBinIndex !== -1) {
      annotationsConfig.meanLine = {
        type: 'line',
        scaleID: 'x',
        value: meanBinIndex,
        borderColor: 'red', // Hardcoded for diagnosis
        borderWidth: 2,
        label: {
          enabled: true,
          content: `Mean: ${formatNumberForLabel(meanValue)}`,
          position: 'top',
          backgroundColor: 'rgba(255,255,255,0.7)', // Hardcoded for diagnosis
          color: 'black', // Hardcoded for diagnosis
          font: { weight: 'bold' },
          yAdjust: -5,
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
          borderColor: 'blue', // Hardcoded for diagnosis
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            enabled: true,
            content: `Median: ${formatNumberForLabel(medianValue)}`,
            position: 'bottom',
            backgroundColor: 'rgba(255,255,255,0.7)', // Hardcoded for diagnosis
            color: 'black', // Hardcoded for diagnosis
            font: { weight: 'bold' },
            yAdjust: 5,
          }
        };
    }
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    const sigmaLineColors = ['grey', 'grey', 'grey', 'grey', 'grey', 'grey']; // Simple hardcoded for diagnosis

    sigmas.forEach((s, idx) => {
      const sigmaVal = meanValue + s * stdDevValue;
      const sigmaBinIndex = findBinIndexForValue(sigmaVal, data);
      if (sigmaBinIndex !== -1) {
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaBinIndex,
          borderColor: sigmaLineColors[idx],
          borderWidth: 1,
          borderDash: [2, 2],
          label: {
            enabled: true,
            content: `${s > 0 ? '+' : ''}${s}σ (${formatNumberForLabel(sigmaVal,1)})`,
            position: s < 0 ? 'start' : 'end',
            rotation: 90,
            backgroundColor: 'rgba(255,255,255,0.7)', // Hardcoded for diagnosis
            color: 'black', // Hardcoded for diagnosis
            font: { size: 10 },
            yAdjust: s < 0 ? -15 : 15,
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
        type: 'category',
        title: {
          display: true,
          text: 'Value Bins',
          color: 'black' // Hardcoded for diagnosis
        },
        grid: {
          color: 'lightgrey', // Hardcoded for diagnosis
          display: false,
        },
        ticks: {
          color: 'black', // Hardcoded for diagnosis
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
        },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Probability',
          color: 'black' // Hardcoded for diagnosis
        },
        grid: {
          color: 'lightgrey', // Hardcoded for diagnosis
        },
        ticks: {
          color: 'black', // Hardcoded for diagnosis
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
        mode: 'index',
        intersect: false,
        backgroundColor: 'white', // Hardcoded for diagnosis
        titleColor: 'black', // Hardcoded for diagnosis
        bodyColor: 'black', // Hardcoded for diagnosis
        callbacks: {
          title: function(tooltipItems: any) {
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
        color: 'black' // Hardcoded for diagnosis
      }
    }
  };

  return (
    <div style={{ height: '450px', width: '100%' }}>
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}

    
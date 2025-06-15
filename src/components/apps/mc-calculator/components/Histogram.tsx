
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
  p5Value?: number;
  p95Value?: number;
}

const formatNumberForLabel = (num: number | undefined, digits: number = 2): string => {
  if (num === undefined || isNaN(num)) return "N/A";
  if (Math.abs(num) < 0.01 && num !== 0 && (Math.abs(num) < 0.0001 || Math.abs(num) > 1e-5 )) return num.toExponential(1);
  if (Math.abs(num) >= 10000 || (Math.abs(num) < 0.1 && num !== 0)) {
    return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 3) });
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const findBinIndexForValue = (value: number, data: HistogramEntry[]): number => {
    if (!data || data.length === 0 || isNaN(value)) return -1;

    if (value <= data[0].upperBound && value >= data[0].lowerBound) return 0;
    if (value >= data[data.length - 1].lowerBound && value <= data[data.length-1].upperBound) return data.length - 1;

    for (let i = 0; i < data.length; i++) {
        if (i < data.length - 1) {
            if (value >= data[i].lowerBound && value < data[i].upperBound) {
                return i;
            }
        } else { 
            if (value >= data[i].lowerBound && value <= data[i].upperBound) {
                return i;
            }
        }
    }
    if (value < data[0].lowerBound) return 0;
    if (value > data[data.length - 1].upperBound) return data.length - 1;

    return -1; 
};


export default function Histogram({
  data,
  title = "Distribution",
  meanValue,
  medianValue,
  stdDevValue,
  p5Value,
  p95Value,
}: Props) {

  const getBarColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
    if (!sigmaCategory) return 'hsl(0, 0%, 88%)'; 

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 60%)'; // Cyan-like
      case '2': return 'hsl(120, 60%, 55%)'; // Green-like
      case '3': return 'hsl(55, 85%, 60%)';  // Yellow-like
      default: return 'hsl(0, 0%, 88%)';   // Light gray
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
     if (!sigmaCategory) return 'hsl(0, 0%, 75%)';

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 45%)'; 
      case '2': return 'hsl(120, 60%, 40%)'; 
      case '3': return 'hsl(55, 85%, 45%)';  
      default: return 'hsl(0, 0%, 75%)';   
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
  const significantBinIndices: Set<number> = new Set();

  if (typeof meanValue === 'number' && !isNaN(meanValue)) {
    const meanBinIndex = findBinIndexForValue(meanValue, data);
    if (meanBinIndex !== -1) {
      significantBinIndices.add(meanBinIndex);
      annotationsConfig.meanLine = {
        type: 'line',
        scaleID: 'x',
        value: meanBinIndex,
        borderColor: 'red', 
        borderWidth: 2,
        label: {
          enabled: true,
          content: `Mean: ${formatNumberForLabel(meanValue)}`,
          position: 'top',
          backgroundColor: 'rgba(255,255,255,0.7)', 
          color: 'black', 
          font: { weight: 'bold' },
          yAdjust: -5,
        }
      };
    }
  }

  if (typeof medianValue === 'number' && !isNaN(medianValue)) {
    const medianBinIndex = findBinIndexForValue(medianValue, data);
     if (medianBinIndex !== -1) {
        significantBinIndices.add(medianBinIndex);
        annotationsConfig.medianLine = {
          type: 'line',
          scaleID: 'x',
          value: medianBinIndex,
          borderColor: 'blue', 
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            enabled: true,
            content: `Median: ${formatNumberForLabel(medianValue)}`,
            position: 'bottom',
            backgroundColor: 'rgba(255,255,255,0.7)',
            color: 'black', 
            font: { weight: 'bold' },
            yAdjust: 5,
          }
        };
    }
  }

  if (typeof p5Value === 'number' && !isNaN(p5Value)) {
    const p5BinIndex = findBinIndexForValue(p5Value, data);
    if (p5BinIndex !== -1) significantBinIndices.add(p5BinIndex);
    // No separate annotation line for P5, label will appear on X-axis
  }
  if (typeof p95Value === 'number' && !isNaN(p95Value)) {
    const p95BinIndex = findBinIndexForValue(p95Value, data);
    if (p95BinIndex !== -1) significantBinIndices.add(p95BinIndex);
     // No separate annotation line for P95, label will appear on X-axis
  }


  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    const sigmaLineColors = ['darkgrey', 'grey', 'lightgrey', 'lightgrey', 'grey', 'darkgrey']; // Adjusted for visibility

    sigmas.forEach((s, idx) => {
      const sigmaVal = meanValue + s * stdDevValue;
      const sigmaBinIndex = findBinIndexForValue(sigmaVal, data);
      if (sigmaBinIndex !== -1) {
        significantBinIndices.add(sigmaBinIndex);
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
            backgroundColor: 'rgba(255,255,255,0.7)', 
            color: 'black', 
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
          color: 'black' 
        },
        grid: {
          color: 'lightgrey', 
          display: false,
        },
        ticks: {
          color: 'black', 
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
          callback: function(tickValue: string | number, index: number, ticks: Tick[]) {
            // tickValue is the index for category scale
            if (significantBinIndices.has(index)) {
              return this.getLabelForValue(index as number); // Show label for significant bins
            }
            return ''; // Hide label for other bins
          }
        },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Probability',
          color: 'black'
        },
        grid: {
          color: 'lightgrey', 
        },
        ticks: {
          color: 'black', 
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
        drawTime: 'afterDatasetsDraw'
      } as AnnotationPluginOptions,
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'white', 
        titleColor: 'black', 
        bodyColor: 'black', 
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
        color: 'black' 
      }
    }
  };

  return (
    <div style={{ height: '450px', width: '100%' }}>
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}

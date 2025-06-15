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
} from "chart.js";
import annotationPlugin, { type AnnotationOptions, type AnnotationPluginOptions } from 'chartjs-plugin-annotation';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, annotationPlugin);

export interface HistogramEntry {
  label: string; // e.g., "100.0-110.0"
  probability: number; // This is the PDF value or normalized frequency
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

const findBinIndexForValue = (value: number, data: HistogramEntry[]): number => {
    if (!data || data.length === 0 || isNaN(value)) return -1;

    for (let i = 0; i < data.length; i++) {
        if (value >= data[i].lowerBound && value <= data[i].upperBound) {
            if (i === data.length - 1 && value === data[i].upperBound) return i;
            if (value < data[i].upperBound || value === data[i].lowerBound) return i;
        }
    }
    if (value < data[0].lowerBound) return 0;
    if (value > data[data.length - 1].upperBound) return data.length - 1;
    if (value === data[data.length -1].upperBound) return data.length -1;

    return -1; 
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
    if (!sigmaCategory) return 'hsl(var(--sigma-other-bg))'; // Fallback

    switch (sigmaCategory) {
      case '1': return 'hsl(var(--sigma-1-bg))';
      case '2': return 'hsl(var(--sigma-2-bg))';
      case '3': return 'hsl(var(--sigma-3-bg))';
      default: return 'hsl(var(--sigma-other-bg))';
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    const sigmaCategory = data[index]?.sigmaCategory;
     if (!sigmaCategory) return 'hsl(var(--sigma-other-border))'; // Fallback

    switch (sigmaCategory) {
      case '1': return 'hsl(var(--sigma-1-border))';
      case '2': return 'hsl(var(--sigma-2-border))';
      case '3': return 'hsl(var(--sigma-3-border))';
      default: return 'hsl(var(--sigma-other-border))';
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
    annotationsConfig.meanLine = {
      type: 'line',
      scaleID: 'x', 
      value: meanBinIndex !== -1 ? meanBinIndex : undefined, 
      borderColor: 'hsl(var(--destructive))', 
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
    const medianBinIndex = findBinIndexForValue(medianValue, data);
    annotationsConfig.medianLine = {
      type: 'line',
      scaleID: 'x', 
      value: medianBinIndex !== -1 ? medianBinIndex : undefined, 
      borderColor: 'hsl(var(--primary))', 
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
    const sigmaLineColor = 'hsl(var(--muted-foreground))'; 
    const sigmaLabelBackgroundColor = 'hsla(var(--background), 0.7)';


    sigmas.forEach((s) => {
      const sigmaVal = meanValue + s * stdDevValue;
      const sigmaBinIndex = findBinIndexForValue(sigmaVal, data);
      if (sigmaBinIndex !== -1) {
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaBinIndex,
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
        mode: 'index',
        intersect: false,
        backgroundColor: `hsl(var(--card))`,
        titleColor: `hsl(var(--card-foreground))`,
        bodyColor: `hsl(var(--card-foreground))`,
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

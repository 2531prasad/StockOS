
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
  label: string; 
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

const formatNumberForLabel = (num: number | undefined, digits: number = 1): string => {
  if (num === undefined || isNaN(num)) return "N/A";
  if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(1);
  if (Math.abs(num) >= 10000 || (Math.abs(num) < 0.1 && num !== 0)) {
     return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) });
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const findBinIndexForValue = (value: number, data: HistogramEntry[]): number => {
    if (!data || data.length === 0 || isNaN(value)) return -1;

    if (data.length === 1 && value >= data[0].lowerBound && value <= data[0].upperBound) {
        return 0;
    }
    
    for (let i = 0; i < data.length; i++) {
        if (value >= data[i].lowerBound && value < data[i].upperBound) {
            return i;
        }
        if (i === data.length - 1 && value >= data[i].lowerBound && value <= data[i].upperBound) {
            return i;
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
}: Props) {

  const getBarColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    if (index < 0 || index >= data.length) return 'hsl(0, 0%, 80%)'; 
    const sigmaCategory = data[index]?.sigmaCategory;
    
    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 50%)'; 
      case '2': return 'hsl(120, 60%, 50%)'; 
      case '3': return 'hsl(55, 85%, 50%)';  
      default: return 'hsl(0, 0%, 88%)';    
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    if (index < 0 || index >= data.length) return 'hsl(0, 0%, 70%)';
    const sigmaCategory = data[index]?.sigmaCategory;

    switch (sigmaCategory) {
      case '1': return 'hsl(180, 70%, 40%)';
      case '2': return 'hsl(120, 60%, 40%)';
      case '3': return 'hsl(55, 85%, 40%)';
      default: return 'hsl(0, 0%, 75%)';
    }
  };

  const chartData: ChartData<'bar'> = {
    labels: data.map(entry => formatNumberForLabel(entry.binCenter, 1)), 
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
        borderColor: 'red', 
        borderWidth: 2,
        label: {
          enabled: true,
          content: `Mean: ${formatNumberForLabel(meanValue)}`,
          position: 'top',
          backgroundColor: 'rgba(255,0,0,0.1)', 
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
            backgroundColor: 'rgba(0,0,255,0.1)', 
            color: 'black', 
            font: { weight: 'bold' },
            yAdjust: 5, 
          }
        };
    }
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    const sigmaLineColors = ['darkgrey', 'grey', 'lightgrey', 'lightgrey', 'grey', 'darkgrey']; 

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
            backgroundColor: 'rgba(128,128,128,0.1)', 
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
        grouped: true, 
        title: {
          display: true,
          text: 'Value Bins (Center)',
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
      } as AnnotationPluginOptions, 
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'white', 
        titleColor: 'black', 
        bodyColor: 'black', 
        callbacks: {
          title: function(tooltipItems: any) {
            const originalBinIndex = tooltipItems[0].dataIndex;
            if (data && data[originalBinIndex]) {
                return `Bin Range: ${data[originalBinIndex].label} (Center: ${tooltipItems[0].label})`;
            }
            return `Bin Center: ${tooltipItems[0].label}`;
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



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
  type ScaleOptionsByType,
  type BarControllerChartOptions
} from "chart.js";
import annotationPlugin, { type AnnotationOptions, type AnnotationPluginOptions } from 'chartjs-plugin-annotation';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, annotationPlugin);

interface HistogramEntry {
  binStart: number;
  label: string; 
  probability: number; 
  lowerBound: number; 
  upperBound: number;
  binCenter: number;
}

interface Props {
  data: HistogramEntry[];
  title?: string;
  meanValue?: number;
  medianValue?: number;
  stdDevValue?: number; 
}

const findBinIndexForValue = (value: number, bins: HistogramEntry[]): number => {
  if (bins.length === 0 || isNaN(value)) return -1;
  for (let i = 0; i < bins.length; i++) {
    if (value >= bins[i].lowerBound && value <= bins[i].upperBound) {
      return i;
    }
  }
  // If value is outside all bins, snap to closest
  if (value < bins[0].lowerBound) return 0;
  if (value > bins[bins.length - 1].upperBound) return bins.length - 1;
  return -1; // Should not happen if logic is correct
};


export default function Histogram({ 
  data, 
  title = "Distribution", 
  meanValue,
  medianValue,
  stdDevValue 
}: Props) {

  const formatNumberForLabel = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const chartData: ChartData<'bar'> = {
    labels: data.map(d => d.label), // X-axis uses bin labels
    datasets: [{
      label: "Probability", 
      data: data.map(entry => entry.probability), // Y-axis shows probability
      backgroundColor: `hsl(var(--primary))`,
      borderColor: `hsl(var(--primary-foreground))`,
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
        scaleID: 'x', // Vertical line on X-axis (categorical)
        value: meanBinIndex, // Index of the bin
        borderColor: 'red', 
        borderWidth: 2,
        label: {
          enabled: true,
          content: `Mean: ${formatNumberForLabel(meanValue)}`,
          position: 'top',
          backgroundColor: 'rgba(255,255,255,0.8)',
          color: 'red',
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
          backgroundColor: 'rgba(255,255,255,0.8)',
          color: 'blue',
          font: { weight: 'bold' },
          yAdjust: 5,
        }
      };
    }
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    const sigmaColors = ['#D3D3D3', '#A9A9A9', '#808080', '#808080', '#A9A9A9', '#D3D3D3']; // Shades of gray

    sigmas.forEach((s, index) => {
      const sigmaVal = meanValue + s * stdDevValue;
      const sigmaBinIndex = findBinIndexForValue(sigmaVal, data);
      if (sigmaBinIndex !== -1) {
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaBinIndex,
          borderColor: sigmaColors[index],
          borderWidth: 1,
          borderDash: [2, 2],
          label: {
            enabled: true,
            content: `${s > 0 ? '+' : ''}${s}σ`,
            position: s < 0 ? 'start' : 'end',
            backgroundColor: 'rgba(255,255,255,0.7)',
            color: sigmaColors[index],
            font: { size: 10, weight: 'normal' },
            rotation: s < 0 ? -90 : 90,
            yAdjust: s < 0 ? -10 : 10,
            xAdjust: 0,
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
        type: 'category', // X-axis is categorical (bin labels)
        title: {
          display: true,
          text: 'Value Bins',
          color: `hsl(var(--foreground))`
        },
        grid: {
          color: `hsl(var(--border))`,
          display: false, // Often cleaner for histograms
        },
        ticks: {
          color: `hsl(var(--foreground))`,
          maxRotation: 45,
          minRotation: 30,
          autoSkip: true,
          maxTicksLimit: data.length > 20 ? Math.floor(data.length / (data.length > 40 ? 3 : 2)) : data.length,
        },
      },
      y: { 
        type: 'linear', // Y-axis is linear (probability)
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
      } as AnnotationPluginOptions, // Cast to satisfy stricter type
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

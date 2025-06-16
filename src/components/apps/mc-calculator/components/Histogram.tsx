
"use client";
import React, { useEffect, useState } from 'react';
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

const FONT_FAMILY_VICTOR_MONO = "'Victor Mono', monospace";

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

interface ChartThemeColors {
  textColor: string;
  gridColor: string;
  tooltipBgColor: string;
  tooltipTextColor: string;
  meanLineColor: string;
  medianLineColor: string;
  annotationLabelColor: string;
  annotationLabelBgAlpha: number;
  sigmaLineColors: string[];
  sigmaBarColors: {
    s1bg: string; s1border: string;
    s2bg: string; s2border: string;
    s3bg: string; s3border: string;
    otherBg: string; otherBorder: string;
  };
}

const getHslaWithOpacity = (hslaString: string, alphaOverride?: number): string => {
  if (!hslaString) return `hsla(0, 0%, 0%, ${alphaOverride ?? 1})`;
  const parts = hslaString.replace(/hsla?\(/, '').replace(/\)/, '').split(',');
  if (parts.length < 3) return `hsla(0, 0%, 0%, ${alphaOverride ?? 1})`;
  
  const h = parts[0].trim();
  const s = parts[1].trim();
  const l = parts[2].trim();
  const a = alphaOverride !== undefined ? alphaOverride.toString() : (parts[3] ? parts[3].trim() : '1');
  
  return `hsla(${h}, ${s}, ${l}, ${a})`;
};


export default function Histogram({
  data,
  title = "Distribution",
  meanValue,
  medianValue,
  stdDevValue,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const [chartThemeColors, setChartThemeColors] = useState<ChartThemeColors>({
    textColor: 'hsla(0, 0%, 95%, 1)', // Off-white
    gridColor: 'hsla(0, 0%, 50%, 0.2)', // Semi-transparent grey
    tooltipBgColor: 'hsla(0, 0%, 15%, 0.9)', // Dark semi-transparent
    tooltipTextColor: 'hsla(0, 0%, 90%, 1)', // Light grey
    meanLineColor: 'hsla(207, 88%, 68%, 1)', // Soft blue
    medianLineColor: 'hsla(125, 43%, 75%, 1)', // Light green
    annotationLabelColor: 'hsla(0, 0%, 90%, 1)',
    annotationLabelBgAlpha: 0.3,
    sigmaLineColors: [
        'hsla(0, 0%, 70%, 0.7)', 'hsla(0, 0%, 60%, 0.7)', 'hsla(0, 0%, 50%, 0.7)',
        'hsla(0, 0%, 50%, 0.7)', 'hsla(0, 0%, 60%, 0.7)', 'hsla(0, 0%, 70%, 0.7)'
    ],
    sigmaBarColors: {
      s1bg: 'hsla(180, 60%, 40%, 0.7)', s1border: 'hsla(180, 60%, 25%, 1)',
      s2bg: 'hsla(120, 50%, 35%, 0.7)', s2border: 'hsla(120, 50%, 20%, 1)',
      s3bg: 'hsla(55, 70%, 40%, 0.7)', s3border: 'hsla(55, 70%, 25%, 1)',
      otherBg: 'hsla(0, 0%, 30%, 0.5)', otherBorder: 'hsla(0, 0%, 40%, 1)',
    }
  });

  useEffect(() => {
    setIsClient(true);
  }, []);


  const getBarColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    if (index < 0 || index >= data.length) return chartThemeColors.sigmaBarColors.otherBg; 
    const sigmaCategory = data[index]?.sigmaCategory;
    
    switch (sigmaCategory) {
      case '1': return chartThemeColors.sigmaBarColors.s1bg; 
      case '2': return chartThemeColors.sigmaBarColors.s2bg; 
      case '3': return chartThemeColors.sigmaBarColors.s3bg;  
      default: return chartThemeColors.sigmaBarColors.otherBg;    
    }
  };

  const getBorderColor = (context: ScriptableContext<'bar'>): string => {
    const index = context.dataIndex;
    if (index < 0 || index >= data.length) return chartThemeColors.sigmaBarColors.otherBorder;
    const sigmaCategory = data[index]?.sigmaCategory;

    switch (sigmaCategory) {
      case '1': return chartThemeColors.sigmaBarColors.s1border;
      case '2': return chartThemeColors.sigmaBarColors.s2border;
      case '3': return chartThemeColors.sigmaBarColors.s3border;
      default: return chartThemeColors.sigmaBarColors.otherBorder;
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
        borderColor: chartThemeColors.meanLineColor, 
        borderWidth: 2,
        label: {
          enabled: true,
          content: `Mean: ${formatNumberForLabel(meanValue)}`,
          position: 'top',
          backgroundColor: getHslaWithOpacity(chartThemeColors.meanLineColor, chartThemeColors.annotationLabelBgAlpha),
          color: chartThemeColors.annotationLabelColor, 
          font: { weight: 'bold', family: FONT_FAMILY_VICTOR_MONO, size: 11 },
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
          borderColor: chartThemeColors.medianLineColor, 
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            enabled: true,
            content: `Median: ${formatNumberForLabel(medianValue)}`,
            position: 'bottom', 
            backgroundColor: getHslaWithOpacity(chartThemeColors.medianLineColor, chartThemeColors.annotationLabelBgAlpha),
            color: chartThemeColors.annotationLabelColor, 
            font: { weight: 'bold', family: FONT_FAMILY_VICTOR_MONO, size: 11 },
            yAdjust: 5, 
          }
        };
    }
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];
    const sigmaLabelBaseColor = 'hsla(0, 0%, 60%, 1)'; 

    sigmas.forEach((s, idx) => {
      const sigmaVal = meanValue + s * stdDevValue;
      const sigmaBinIndex = findBinIndexForValue(sigmaVal, data);
      if (sigmaBinIndex !== -1) {
        annotationsConfig[`sigmaLine${s}`] = {
          type: 'line',
          scaleID: 'x',
          value: sigmaBinIndex,
          borderColor: chartThemeColors.sigmaLineColors[idx], 
          borderWidth: 1,
          borderDash: [2, 2],
          label: {
            enabled: true,
            content: `${s > 0 ? '+' : ''}${s}σ (${formatNumberForLabel(sigmaVal,1)})`,
            position: s < 0 ? 'start' : 'end',
            rotation: 90,
            backgroundColor: getHslaWithOpacity(sigmaLabelBaseColor, chartThemeColors.annotationLabelBgAlpha / 2), 
            color: chartThemeColors.annotationLabelColor, 
            font: { size: 10, family: FONT_FAMILY_VICTOR_MONO },
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
          color: chartThemeColors.textColor,
          font: {
            family: FONT_FAMILY_VICTOR_MONO,
            size: 12,
          }
        },
        grid: {
          color: chartThemeColors.gridColor, 
          display: false, 
        },
        ticks: {
          color: chartThemeColors.textColor, 
          maxRotation: 45, 
          minRotation: 30,
          autoSkip: true,
          font: {
            family: FONT_FAMILY_VICTOR_MONO,
            size: 10,
          }
        },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Probability',
          color: chartThemeColors.textColor,
          font: {
            family: FONT_FAMILY_VICTOR_MONO,
            size: 12,
          }
        },
        grid: {
          color: chartThemeColors.gridColor, 
        },
        ticks: {
          color: chartThemeColors.textColor, 
          callback: function(value: string | number) {
            if (typeof value === 'number') {
              return (value * 100).toFixed(0) + '%';
            }
            return value;
          },
          font: {
            family: FONT_FAMILY_VICTOR_MONO,
            size: 10,
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
        backgroundColor: chartThemeColors.tooltipBgColor, 
        titleColor: chartThemeColors.tooltipTextColor, 
        bodyColor: chartThemeColors.tooltipTextColor,
        titleFont: { family: FONT_FAMILY_VICTOR_MONO, size: 12, weight: 'bold' },
        bodyFont: { family: FONT_FAMILY_VICTOR_MONO, size: 11 },
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
          size: 16,
          family: FONT_FAMILY_VICTOR_MONO,
          weight: 'bold',
        },
        color: chartThemeColors.textColor 
      }
    }
  };

  if (!isClient) {
    return <div className="w-full h-full flex items-center justify-center"><p style={{color: chartThemeColors.textColor, opacity: 0.7}}>Loading chart...</p></div>;
  }

  return (
    <div className="w-full h-full"> 
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p style={{color: chartThemeColors.textColor, opacity: 0.7}} className="flex items-center justify-center h-full">Loading chart data or no data to display...</p>}
    </div>
  );
}


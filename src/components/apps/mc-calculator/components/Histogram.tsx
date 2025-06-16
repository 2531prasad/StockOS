
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

const getHslaWithOpacity = (hslString: string, alpha: number): string => {
  if (!hslString) return `hsla(0, 0%, 0%, ${alpha})`; 
  const [h, s, l] = hslString.split(' ');
  return `hsla(${h}, ${s}, ${l}, ${alpha})`;
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
    textColor: 'black',
    gridColor: 'lightgrey',
    tooltipBgColor: 'white',
    tooltipTextColor: 'black',
    meanLineColor: 'red',
    medianLineColor: 'blue',
    annotationLabelColor: 'black',
    annotationLabelBgAlpha: 0.1,
    sigmaLineColors: ['darkgrey', 'grey', 'lightgrey', 'lightgrey', 'grey', 'darkgrey'],
    sigmaBarColors: {
      s1bg: 'hsl(180, 70%, 50%)', s1border: 'hsl(180, 70%, 40%)',
      s2bg: 'hsl(120, 60%, 50%)', s2border: 'hsl(120, 60%, 40%)',
      s3bg: 'hsl(55, 85%, 50%)', s3border: 'hsl(55, 85%, 40%)',
      otherBg: 'hsl(0, 0%, 88%)', otherBorder: 'hsl(0, 0%, 75%)',
    }
  });

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const rootStyle = getComputedStyle(document.documentElement);
      const isDarkMode = document.documentElement.classList.contains('dark');

      const fgCssVar = rootStyle.getPropertyValue('--foreground').trim();
      const borderCssVar = rootStyle.getPropertyValue('--border').trim();
      const popoverCssVar = rootStyle.getPropertyValue('--popover').trim();
      const popoverFgCssVar = rootStyle.getPropertyValue('--popover-foreground').trim();
      const primaryCssVar = rootStyle.getPropertyValue('--primary').trim();
      const secondaryCssVar = rootStyle.getPropertyValue('--secondary').trim(); 
      
      setChartThemeColors({
        textColor: `hsl(${fgCssVar})`,
        gridColor: `hsla(${borderCssVar}, 0.5)`, 
        tooltipBgColor: `hsl(${popoverCssVar})`,
        tooltipTextColor: `hsl(${popoverFgCssVar})`,
        meanLineColor: `hsl(${primaryCssVar})`,
        medianLineColor: `hsl(${secondaryCssVar})`,
        annotationLabelColor: `hsl(${fgCssVar})`,
        annotationLabelBgAlpha: 0.2, 
        sigmaLineColors: isDarkMode 
          ? ['hsl(0,0%,60%)', 'hsl(0,0%,50%)', 'hsl(0,0%,40%)', 'hsl(0,0%,40%)', 'hsl(0,0%,50%)', 'hsl(0,0%,60%)']
          : ['darkgrey', 'grey', 'lightgrey', 'lightgrey', 'grey', 'darkgrey'],
        sigmaBarColors: {
          s1bg: `hsl(${rootStyle.getPropertyValue('--sigma-1-bg').trim()})`,
          s1border: `hsl(${rootStyle.getPropertyValue('--sigma-1-border').trim()})`,
          s2bg: `hsl(${rootStyle.getPropertyValue('--sigma-2-bg').trim()})`,
          s2border: `hsl(${rootStyle.getPropertyValue('--sigma-2-border').trim()})`,
          s3bg: `hsl(${rootStyle.getPropertyValue('--sigma-3-bg').trim()})`,
          s3border: `hsl(${rootStyle.getPropertyValue('--sigma-3-border').trim()})`,
          otherBg: `hsl(${rootStyle.getPropertyValue('--sigma-other-bg').trim()})`,
          otherBorder: `hsl(${rootStyle.getPropertyValue('--sigma-other-border').trim()})`,
        }
      });
    }
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
  const primaryCssVarForLabel = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() : '';
  const secondaryCssVarForLabel = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() : '';
  const mutedFgCssVarForLabel = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim() : '';


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
          backgroundColor: getHslaWithOpacity(primaryCssVarForLabel, chartThemeColors.annotationLabelBgAlpha),
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
            backgroundColor: getHslaWithOpacity(secondaryCssVarForLabel, chartThemeColors.annotationLabelBgAlpha),
            color: chartThemeColors.annotationLabelColor, 
            font: { weight: 'bold', family: FONT_FAMILY_VICTOR_MONO, size: 11 },
            yAdjust: 5, 
          }
        };
    }
  }

  if (typeof meanValue === 'number' && !isNaN(meanValue) && typeof stdDevValue === 'number' && !isNaN(stdDevValue) && stdDevValue > 0) {
    const sigmas = [-3, -2, -1, 1, 2, 3];

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
            backgroundColor: getHslaWithOpacity(mutedFgCssVarForLabel, chartThemeColors.annotationLabelBgAlpha / 2), 
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
    return <div style={{ height: '450px', width: '100%' }} className="flex items-center justify-center"><p className="text-muted-foreground">Loading chart...</p></div>;
  }

  return (
    <div style={{ height: '450px', width: '100%' }}> 
      {data && data.length > 0 ? <Bar data={chartData} options={options} /> : <p className="text-muted-foreground">Loading chart data or no data to display...</p>}
    </div>
  );
}


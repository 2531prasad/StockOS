
"use client";
import React, { useState, useEffect } from "react";
import { useCalculator, type CalculatorResults, type HistogramDataEntry } from "./hooks/useCalculator";
import Histogram from "./components/Histogram";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Terminal } from "lucide-react";


export default function MCCalculator() {
  const [expression, setExpression] = useState("");
  const [iterations, setIterations] = useState(100000);
  const [histogramBins, setHistogramBins] = useState(23);
  const [submittedExpression, setSubmittedExpression] = useState("");
  const [submittedIterations, setSubmittedIterations] = useState(0);
  const [submittedHistogramBins, setSubmittedHistogramBins] = useState(histogramBins);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const result = useCalculator(
    submittedExpression,
    submittedIterations > 0 ? submittedIterations : 1, 
    submittedHistogramBins
  );

  const handleCalculate = () => {
    if (!expression.trim()) {
      setSubmittedExpression(""); 
      setSubmittedIterations(0); 
      return;
    }
    setSubmittedExpression(expression);
    setSubmittedIterations(iterations);
    setSubmittedHistogramBins(histogramBins);
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";

    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    if (absNum >= 1_000_000_000) {
      return sign + (absNum / 1_000_000_000).toFixed(1) + "B";
    }
    if (absNum >= 1_000_000) {
      return sign + (absNum / 1_000_000).toFixed(1) + "M";
    }
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const renderDeterministicOutput = (calcResult: CalculatorResults) => (
    <div className="text-3xl font-bold text-primary py-4 bg-muted/30 p-6 rounded-md text-left shadow-inner">
      {formatNumber(calcResult.results[0])}
    </div>
  );

  const showResultsArea = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  // True Range should only show for probabilistic calculations where analytical min/max are valid
  const showTrueRangeConditionally = showResultsArea && !result.isDeterministic && (!isNaN(result.analyticalMin) || !isNaN(result.analyticalMax));
  // Advanced controls (Iterations, Bars) only for probabilistic results
  const showAdvancedControlsConditionally = showResultsArea && !result.isDeterministic;


  const renderProbabilisticOutput = (calcResult: CalculatorResults) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-2 pt-2 text-xs">
        <p><strong>Simulated Range:</strong> {formatNumber(calcResult.min)} ~ {formatNumber(calcResult.max)}</p>
        <p><strong>Mean (μ):</strong> {formatNumber(calcResult.mean)}</p>
        <p><strong>Std Dev (σ):</strong> {formatNumber(calcResult.stdDev)}</p>
        <p><strong>Median (P50):</strong> {formatNumber(calcResult.p50)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-4 text-xs">
        <p><strong>P5:</strong> {formatNumber(calcResult.p5)}</p>
        <p><strong>P10:</strong> {formatNumber(calcResult.p10)}</p>
        <p><strong>P90:</strong> {formatNumber(calcResult.p90)}</p>
        <p><strong>P95:</strong> {formatNumber(calcResult.p95)}</p>
      </div>

      {isClient && calcResult.histogram && calcResult.histogram.length > 0 && !isNaN(calcResult.mean) && !isNaN(calcResult.stdDev) ? (
        <div className="w-full h-[450px] min-h-[300px]">
          <Histogram
            data={calcResult.histogram as HistogramDataEntry[]}
            title="Outcome Distribution"
            meanValue={calcResult.mean}
            medianValue={calcResult.p50}
            stdDevValue={calcResult.stdDev}
          />
        </div>
      ) : submittedExpression && !result.error && !result.isDeterministic ? <p className="text-muted-foreground text-xs">Distribution chart data is not available. Results might be too uniform or an error occurred.</p> : null}
      
      {showAdvancedControlsConditionally && (
        <div className="flex flex-row justify-center items-start gap-x-8 mt-6">
          <div className="flex flex-col space-y-1 w-full max-w-[180px] items-center">
            <Label htmlFor="histogram-bins-slider-ctrl-prob" className="text-muted-foreground text-base self-center">
              Bars: {histogramBins}
            </Label>
            <Slider
              id="histogram-bins-slider-ctrl-prob"
              min={5}
              max={50}
              step={1}
              value={[histogramBins]}
              onValueChange={(value) => setHistogramBins(value[0])}
              className="relative flex w-full touch-none select-none items-center mt-1"
            />
          </div>
          <div className="flex flex-col space-y-1 items-center">
            <Label htmlFor="iterations-input-ctrl-prob" className="text-muted-foreground text-base">Iterations</Label>
            <Input
              id="iterations-input-ctrl-prob"
              type="number"
              value={iterations}
              onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 100000))}
              className="w-24 h-9 text-base mt-1"
              min="100"
              step="1000"
            />
          </div>
        </div>
      )}
    </>
  );
  

  return (
    <div className="h-full w-full flex flex-col">
      <div className="overflow-hidden p-4 space-y-4 min-h-0"> {/* Changed overflow-y-auto to overflow-hidden here */}
        {/* Inputs and Calculate Button Section */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="grow text-base h-10" 
            placeholder="e.g., 50~60 * 10 + (100~120)/2"
            aria-label="Expression Input"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
          />
          <div className="flex items-center space-x-1">
            <Button onClick={handleCalculate} className="text-base h-10">Calculate</Button>
          </div>
        </div>

        {/* Control Row: True Range, Bars, Iterations */}
         <div className="flex flex-row items-start gap-x-6 gap-y-4 mt-3">
            {/* True Range Column */}
            {showTrueRangeConditionally && (
                <div className="flex flex-col space-y-1">
                <Label htmlFor="true-range-display" className="text-muted-foreground text-base">True Range</Label>
                <p id="true-range-display" className="text-foreground font-medium whitespace-nowrap text-lg">
                    {formatNumber(result.analyticalMin)} ~ {formatNumber(result.analyticalMax)}
                </p>
                {result.analyticalError && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 max-w-[200px] truncate" title={result.analyticalError}>
                        {result.analyticalError}
                    </p>
                )}
                </div>
            )}
        </div>


        {/* Error Alert Section */}
        {result.error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        {/* Results and Histogram Section */}
        <div className="space-y-2">
          {showResultsArea && result.isDeterministic && renderDeterministicOutput(result)}
          {showResultsArea && !result.isDeterministic && renderProbabilisticOutput(result)}
        </div>
      </div>
    </div>
  );
}


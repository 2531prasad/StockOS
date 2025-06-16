
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
      // If expression is empty, reset results but don't show errors for empty submission.
      setSubmittedExpression(""); // This will trigger useCalculator to return default results.
      setSubmittedIterations(0); // Or keep previous iterations if preferred.
      return;
    }
    setSubmittedExpression(expression);
    setSubmittedIterations(iterations);
    setSubmittedHistogramBins(histogramBins);
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const renderDeterministicOutput = (calcResult: CalculatorResults) => (
    <div className="text-3xl font-bold text-primary py-4 bg-muted/30 p-6 rounded-md text-left shadow-inner">
      {formatNumber(calcResult.results[0])}
    </div>
  );

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
        <div className="flex flex-col items-center mt-4">
          <div className="flex flex-col space-y-1 w-full max-w-xs">
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
        </div>
      )}
    </>
  );
  
  const showResultsArea = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showAdvancedControlsConditionally = showResultsArea && !result.isDeterministic;
  const showTrueRangeConditionally = showResultsArea && !result.isDeterministic && (!isNaN(result.analyticalMin) || !isNaN(result.analyticalMax));


  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"> {/* Single scrollable container */}
        {/* Inputs and Calculate Button Section */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="grow text-base"
            placeholder="e.g., 50~60 * 10 + (100~120)/2"
            aria-label="Expression Input"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
          />
          <div className="flex items-center space-x-1">
            <Button onClick={handleCalculate} className="text-base h-10">Calculate</Button>
          </div>
        </div>

        {/* True Range and Iterations Controls Row */}
        {(showTrueRangeConditionally || showAdvancedControlsConditionally) && (
          <div className="flex flex-row items-start gap-x-6 gap-y-4 mt-3">
            {/* True Analytical Range Column */}
            {showTrueRangeConditionally && (
              <div className="flex flex-col space-y-1">
                <Label className="text-muted-foreground text-base">True Range</Label>
                <p className="text-foreground font-medium whitespace-nowrap text-base">
                  {formatNumber(result.analyticalMin)} ~ {formatNumber(result.analyticalMax)}
                </p>
                {result.analyticalError && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 max-w-[200px] truncate" title={result.analyticalError}>
                     {result.analyticalError}
                  </p>
                )}
              </div>
            )}
            
            {/* Iterations Column */}
            {showAdvancedControlsConditionally && (
              <div className="flex flex-col space-y-1">
                <Label htmlFor="iterations-input-ctrl" className="text-muted-foreground text-base">Iterations</Label>
                <Input
                  id="iterations-input-ctrl"
                  type="number"
                  value={iterations}
                  onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 100000))}
                  className="w-24 h-9 text-base mt-1"
                  min="100"
                  step="1000"
                />
              </div>
            )}
          </div>
        )}

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

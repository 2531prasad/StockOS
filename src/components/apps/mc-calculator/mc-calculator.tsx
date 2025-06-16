
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
    // No initial calculation
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const renderDeterministicOutput = (calcResult: CalculatorResults) => (
    <div className="text-3xl font-bold text-primary py-4 bg-muted/30 p-6 rounded-md text-left shadow-inner">
      {formatNumber(calcResult.results[0])}
    </div>
  );

  const renderProbabilisticOutput = (calcResult: CalculatorResults) => (
    <> 
      {(!isNaN(calcResult.analyticalMin) || !isNaN(calcResult.analyticalMax)) && (
        <div className="mb-2 pt-2">
          <p><strong>True Analytical Range:</strong> {formatNumber(calcResult.analyticalMin)} ~ {formatNumber(calcResult.analyticalMax)}</p>
           {calcResult.analyticalError && (
             <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Note on Analytical Range: {calcResult.analyticalError}
            </p>
           )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-2 pt-2">
        <p><strong>Simulated Range:</strong> {formatNumber(calcResult.min)} ~ {formatNumber(calcResult.max)}</p>
        <p><strong>Mean (μ):</strong> {formatNumber(calcResult.mean)}</p>
        <p><strong>Std Dev (σ):</strong> {formatNumber(calcResult.stdDev)}</p>
        <p><strong>Median (P50):</strong> {formatNumber(calcResult.p50)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-4">
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
      ) : submittedExpression && !result.error && !result.isDeterministic ? <p className="text-muted-foreground">Distribution chart data is not available. Results might be too uniform or an error occurred.</p> : null}
    </>
  );

  const showResultsArea = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showAdvancedControls = submittedExpression && !result.isDeterministic && !result.error && (result.results && result.results.length > 0 && !result.results.every(isNaN)));


  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Inputs and Controls Section */}
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

        {showAdvancedControls && (
          <div className="space-y-4"> {/* Wrapper for advanced controls to participate in space-y */}
            <div>
              <Label htmlFor="iterations-input" className="text-xs text-muted-foreground">Iterations</Label>
              <Input
                id="iterations-input"
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 100000))}
                className="w-full sm:w-32 text-base mt-1"
                placeholder="Iterations"
                aria-label="Number of Iterations"
                min="100"
                step="1000"
              />
            </div>

            <div>
              <Label htmlFor="histogram-bins-slider" className="text-sm font-medium">
                Chart Detail (Number of Points/Bars): {histogramBins}
              </Label>
              <Slider
                id="histogram-bins-slider"
                min={5}
                max={50}
                step={1}
                value={[histogramBins]}
                onValueChange={(value) => setHistogramBins(value[0])}
                className="mt-2"
                aria-label="Histogram Bins Slider"
              />
            </div>
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
        <div className="space-y-2 text-sm md:text-base">
          {showResultsArea && result.isDeterministic && renderDeterministicOutput(result)}
          {showResultsArea && !result.isDeterministic && renderProbabilisticOutput(result)}
        </div>
      </div>
    </div>
  );
}

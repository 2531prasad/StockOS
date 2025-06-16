
"use client";
import React, { useState, useEffect } from "react";
import { useCalculator, type CalculatorResults, type HistogramDataEntry } from "./hooks/useCalculator";
import Histogram from "./components/Histogram";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardContent as AppCardContent } from "@/components/ui/card"; // Renamed to avoid conflict
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Terminal } from "lucide-react";

export default function MCCalculator() {
  const [expression, setExpression] = useState("1400~1700 * 0.55~0.65 - 600~700 - 100~200 - 30 - 20");
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
    submittedIterations > 0 ? submittedIterations : 1, // Ensure at least 1 iteration
    submittedHistogramBins
  );

  const handleCalculate = () => {
    if (!expression.trim()) {
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
    <div className="text-3xl font-bold text-primary py-4 bg-muted/30 p-6 rounded-md text-center shadow-inner">
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
        <div className="mt-4 h-[450px] w-full">
          <Histogram
            data={calcResult.histogram as HistogramDataEntry[]}
            title="Outcome Distribution"
            meanValue={calcResult.mean}
            medianValue={calcResult.p50}
            stdDevValue={calcResult.stdDev}
          />
        </div>
      ) : submittedExpression && !calcResult.error && !calcResult.isDeterministic ? <p className="text-muted-foreground">Distribution chart data is not available. Results might be too uniform or an error occurred.</p> : null}
    </>
  );
  
  const showResultsArea = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showAdvancedControls = submittedExpression && !result.isDeterministic && !result.error && (result.results && result.results.length > 0 && !result.results.every(isNaN));


  return (
    <div className="font-body h-full flex flex-col bg-card text-card-foreground">
      <AppCardContent className="flex-grow p-4 overflow-y-auto"> 
        <div className="grid grid-cols-[1fr_auto] gap-2 mb-4 items-end">
          <Input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="grow text-base"
            placeholder="e.g., 50~60 * 10 + (100~120)/2"
            aria-label="Expression Input"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
          />
          <Button onClick={handleCalculate} className="text-base h-10">Calculate</Button>
        </div>

        {showAdvancedControls && (
          <>
            <div className="mb-4">
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

            <div className="mb-6">
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
          </>
        )}

        {result.error && (
          <Alert variant="destructive" className="mb-4 mt-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm md:text-base mt-4">
          {showResultsArea && result.isDeterministic && renderDeterministicOutput(result)}
          {showResultsArea && !result.isDeterministic && renderProbabilisticOutput(result)}
        </div>
      </AppCardContent>
    </div>
  );
}
    


"use client";
import React, { useState, useEffect } from "react";
import { useCalculator, type CalculatorResults } from "./hooks/useCalculator";
import Histogram from "./components/Histogram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Terminal } from "lucide-react";

export default function MCCalculator() {
  const [expression, setExpression] = useState("1400~1700 * 0.55~0.65 - 600~700 - 100~200 - 30 - 20");
  const [iterations, setIterations] = useState(10000);
  const [histogramBins, setHistogramBins] = useState(23); 
  const [submittedExpression, setSubmittedExpression] = useState(""); 
  const [submittedIterations, setSubmittedIterations] = useState(0); // Initialize with 0 to prevent initial calc with default iterations
  const [submittedHistogramBins, setSubmittedHistogramBins] = useState(histogramBins);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // No initial calculation on load. User must click "Calculate".
  }, []); 
  
  const result = useCalculator(
    submittedExpression, 
    submittedIterations > 0 ? submittedIterations : 10000, // Ensure at least 1 iteration if submitted, or default for hook
    submittedHistogramBins
  );
  
  const handleCalculate = () => {
    if (!expression.trim()) {
        // Optionally, show a toast or an inline message if the expression is empty
        // For now, just return to prevent calculation with empty input.
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
    <div className="text-2xl font-bold text-primary py-4">
        Output: {formatNumber(calcResult.results[0])}
    </div>
  );

  const renderProbabilisticOutput = (calcResult: CalculatorResults) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-2 pt-2">
        <p><strong>Range:</strong> {formatNumber(calcResult.min)} ~ {formatNumber(calcResult.max)}</p>
        <p><strong>Mean:</strong> {formatNumber(calcResult.mean)}</p>
        <p><strong>Std Dev:</strong> {formatNumber(calcResult.stdDev)}</p>
        <p><strong>Median (P50):</strong> {formatNumber(calcResult.p50)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mb-4">
        <p><strong>P5:</strong> {formatNumber(calcResult.p5)}</p>
        <p><strong>P10:</strong> {formatNumber(calcResult.p10)}</p>
        <p><strong>P90:</strong> {formatNumber(calcResult.p90)}</p>
        <p><strong>P95:</strong> {formatNumber(calcResult.p95)}</p>
      </div>

      {calcResult.histogram && calcResult.histogram.length > 0 && !isNaN(calcResult.mean) && !isNaN(calcResult.p50) ? (
        <div className="mt-4 h-[400px] w-full">
          <Histogram 
            data={calcResult.histogram} 
            title="Outcome Distribution (Probability Density)"
            meanValue={calcResult.mean}
            medianValue={calcResult.p50}
            yScaleMin={calcResult.min} // Pass overall min for Y-axis scaling
            yScaleMax={calcResult.max} // Pass overall max for Y-axis scaling
          />
        </div>
      ) : submittedExpression && !calcResult.error ? <p className="text-muted-foreground">Distribution chart data is not available. Results might be too uniform or an error occurred.</p> : null }
    </>
  );

  // Determine when to show results or initial message
  const showResults = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showInitialMessage = !submittedExpression && !result.error;

  return (
    <div className="container mx-auto p-4 md:p-8 font-body">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Monte Carlo Calculator</CardTitle>
          <CardDescription>Enter expressions with ranges (e.g., 100~120) for probabilistic simulation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-4 items-end">
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="flex-grow text-base"
              placeholder="e.g., 50~60 * 10 + (100~120)/2"
              aria-label="Expression Input"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
            />
            <div className="flex flex-col space-y-1">
              <Label htmlFor="iterations-input" className="text-xs text-muted-foreground">Iterations</Label>
              <Input
                id="iterations-input"
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 10000))}
                className="w-full sm:w-32 text-base"
                placeholder="Iterations"
                aria-label="Number of Iterations"
                min="100"
                step="1000"
              />
            </div>
             <Button onClick={handleCalculate} className="text-base h-10">Calculate</Button>
          </div>
          
          <div className="mb-6">
            <Label htmlFor="histogram-bins-slider" className="text-sm font-medium">
              Histogram Bins: {histogramBins}
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


          {result.error && (
             <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm md:text-base">
            {showInitialMessage && <p className="text-muted-foreground">Enter an expression and click Calculate to see results and distribution chart.</p>}
            {showResults && result.isDeterministic && renderDeterministicOutput(result)}
            {showResults && !result.isDeterministic && renderProbabilisticOutput(result)}
          </div>
        </CardContent>
      </Card>
       <footer className="text-center mt-8 text-muted-foreground text-xs">
        <p>Uses <a href="https://mathjs.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">math.js</a> for expression parsing and <a href="https://www.chartjs.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Chart.js</a> for visualization.</p>
      </footer>
    </div>
  );
}


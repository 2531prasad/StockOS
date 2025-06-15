
"use client";
import React, { useState, useMemo } from "react";
import { useCalculator, type CalculatorResults } from "./hooks/useCalculator";
import Histogram from "./components/Histogram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function MCCalculator() {
  const [expression, setExpression] = useState("1400~1700 * 0.55~0.65 - 600~700 - 100~200 - 30 - 20");
  const [iterations, setIterations] = useState(10000);
  const [submittedExpression, setSubmittedExpression] = useState(expression);
  const [submittedIterations, setSubmittedIterations] = useState(iterations);

  const result = useCalculator(submittedExpression, submittedIterations);
  
  const handleCalculate = () => {
    setSubmittedExpression(expression);
    setSubmittedIterations(iterations);
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    // Use toLocaleString for better readability and precision control
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };
  
  const renderDeterministicOutput = (calcResult: CalculatorResults) => (
    <div className="text-2xl font-bold text-primary">
        Output: {formatNumber(calcResult.results[0])}
    </div>
  );

  const renderProbabilisticOutput = (calcResult: CalculatorResults) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
        <p><strong>Range:</strong> {formatNumber(calcResult.min)} ~ {formatNumber(calcResult.max)}</p>
        <p><strong>Mean:</strong> {formatNumber(calcResult.mean)}</p>
        <p><strong>Std Dev:</strong> {formatNumber(calcResult.stdDev)}</p>
        <p><strong>5th %:</strong> {formatNumber(calcResult.p5)}</p>
        <p><strong>10th %:</strong> {formatNumber(calcResult.p10)}</p>
        <p><strong>Median (50th %):</strong> {formatNumber(calcResult.p50)}</p>
        <p><strong>90th %:</strong> {formatNumber(calcResult.p90)}</p>
        <p><strong>95th %:</strong> {formatNumber(calcResult.p95)}</p>
      </div>
      {calcResult.histogram && calcResult.histogram.length > 0 && calcResult.histogram[0].count > 0 ? (
        <div className="mt-4 h-[300px] w-full"> {/* Ensure container has height */}
          <Histogram data={calcResult.histogram} title="Outcome Distribution"/>
        </div>
      ) : <p className="text-muted-foreground">Histogram data is not available or all counts are zero.</p>}
    </>
  );

  return (
    <div className="container mx-auto p-4 md:p-8 font-body">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Monte Carlo Calculator</CardTitle>
          <CardDescription>Enter expressions with ranges (e.g., 100~120) for probabilistic simulation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="flex-grow text-base"
              placeholder="e.g., 50~60 * 10 + (100~120)/2"
              aria-label="Expression Input"
            />
            <Input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 10000))}
              className="w-full sm:w-32 text-base"
              placeholder="Iterations"
              aria-label="Number of Iterations"
              min="100"
            />
            <Button onClick={handleCalculate} className="text-base">Calculate</Button>
          </div>

          {result.error && (
             <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm md:text-base">
            {result.isDeterministic && !result.error ? renderDeterministicOutput(result) : null}
            {!result.isDeterministic && !result.error && result.results.length > 0 ? renderProbabilisticOutput(result) : null}
            {!result.error && result.results.length === 0 && <p className="text-muted-foreground">Enter an expression and click Calculate.</p>}
          </div>
        </CardContent>
      </Card>
       <footer className="text-center mt-8 text-muted-foreground text-xs">
        <p>Uses <a href="https://mathjs.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">math.js</a> for expression parsing and <a href="https://www.chartjs.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Chart.js</a> for visualization.</p>
      </footer>
    </div>
  );
}

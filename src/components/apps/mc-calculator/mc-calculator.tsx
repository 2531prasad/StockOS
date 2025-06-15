
"use client";
import React, { useState, useEffect } from "react";
import { useCalculator, type CalculatorResults } from "./hooks/useCalculator";
import Histogram from "./components/Histogram";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Terminal, HelpCircle, Info } from "lucide-react";

export default function MCCalculator() {
  const [expression, setExpression] = useState("1400~1700 * 0.55~0.65 - 600~700 - 100~200 - 30 - 20");
  const [iterations, setIterations] = useState(100000); // Changed default to 100000
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
    submittedIterations > 0 ? submittedIterations : 1, // Ensure iterations is at least 1
    submittedHistogramBins
  );

  const handleCalculate = () => {
    if (!expression.trim()) {
      // Optionally, show an alert or toast for empty expression
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
      {(!isNaN(calcResult.analyticalMin) || !isNaN(calcResult.analyticalMax)) && (
        <div className="mb-2 pt-2">
          <p><strong>True Analytical Range:</strong> {formatNumber(calcResult.analyticalMin)} ~ {formatNumber(calcResult.analyticalMax)}</p>
           {calcResult.analyticalError && (
             <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center">
                <Info size={14} className="mr-1 shrink-0" />
                <span>Note on Analytical Range: {calcResult.analyticalError}</span>
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
            data={calcResult.histogram}
            title="Outcome Distribution"
            meanValue={calcResult.mean}
            medianValue={calcResult.p50}
            stdDevValue={calcResult.stdDev}
          />
        </div>
      ) : submittedExpression && !calcResult.error ? <p className="text-muted-foreground">Distribution chart data is not available. Results might be too uniform or an error occurred.</p> : null}
    </>
  );
  
  const showResults = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showInitialMessage = !submittedExpression && !result.error;


  return (
    <div className="container mx-auto p-4 md:p-8 font-body">
      <Card className="w-full max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl md:text-3xl">Monte Carlo Calculator</CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="ml-2">
                  <HelpCircle className="h-5 w-5" />
                  <span className="sr-only">How it Works</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">How This Calculator Works</AlertDialogTitle>
                   <div className="text-sm text-muted-foreground text-left max-h-[70vh] overflow-y-auto pr-2 space-y-4">
                    <div>
                      <h3 className="font-semibold text-base mb-1">🚀 What This Calculator Does</h3>
                      <p>Unlike normal calculators, this tool allows you to:</p>
                      <ul className="list-disc list-inside ml-4">
                        <li>Use ranges (uncertainty) in inputs (e.g. 5~10)</li>
                        <li>Simulate thousands of random outcomes using Monte Carlo</li>
                        <li>Calculate a True Analytical Range (exact min/max bounds)</li>
                        <li>Visualize result distributions via a histogram</li>
                        <li>Understand risk and variability through percentiles</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-base mb-1">✍️ Expression Syntax</h3>
                      <div className="space-y-1">
                        <p><strong>Fixed number:</strong> As usual (e.g., <code>5 + 10</code>)</p>
                        <p><strong>Uncertain/range value:</strong> Use ~ between min and max (e.g., <code>5~10</code>, <code>-2~3.5</code>)</p>
                        <p><strong>Percentage range (implicit):</strong> <code>(10-20%)</code> or <code>(10~20%)</code> becomes <code>(10%~20%)</code></p>
                        <p><strong>Percentage range (explicit):</strong> <code>10% - 20%</code> becomes <code>10% ~ 20%</code></p>
                        <p><strong>Applying a % range:</strong> <code>500 (10%~20%)</code> becomes <code>500 * (1.1~1.2)</code></p>
                        <p><strong>Round values:</strong> Use round(...) (e.g., <code>round(1~6)</code>)</p>
                        <p><strong>Multiplication:</strong> Use * or implicit like 5(2~3) (e.g., <code>2 * (3~5)</code>, or <code>5(1~6)</code>)</p>
                        <p><strong>Area of circle:</strong> pi * r^2 (e.g., <code>pi * (4~6)^2</code>)</p>
                        <p><strong>Salary model (yearly):</strong> monthly * 12 (e.g., <code>(3000~4000) * 12</code>)</p>
                        <p><strong>Investment growth:</strong> Compound multiplication (e.g., <code>10000 * (1 + 0.05~0.15)^5</code>)</p>
                        <p><strong>Dice roll (2 dice sum):</strong> round(1~6) + round(1~6) (✅ realistic distribution)</p>
                        <p><strong>Population sampling:</strong> Multiple samples per range (e.g., <code>round(20~30) + round(20~30) + ...</code>)</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-base mb-1">📈 Interpreting the Results</h3>
                      <p>After simulation (default 100,000 iterations), you’ll get:</p>
                      <ul className="list-disc list-inside ml-4">
                        <li><strong>True Analytical Range:</strong> The exact mathematical min-max possible based on input range combinations. May be an approximation for very complex expressions (many ranges).</li>
                        <li><strong>Simulated Range:</strong> The min-max from the Monte Carlo samples.</li>
                        <li><strong>Mean:</strong> Average outcome</li>
                        <li><strong>Std Dev:</strong> Statistical spread (variability)</li>
                        <li><strong>Median (P50):</strong> 50th percentile (center of data)</li>
                        <li><strong>P5, P10, P90, P95:</strong> Useful risk boundaries</li>
                        <li><strong>Histogram:</strong> Shape of result distribution</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-base mb-1">🎨 Histogram Features</h3>
                      <p>Bar colors reflect standard deviation zones:</p>
                      <ul className="list-disc list-inside ml-4">
                        <li><span style={{color: 'hsl(180, 70%, 50%)'}}>█</span> Center (±1σ) — most likely values</li>
                        <li><span style={{color: 'hsl(120, 60%, 50%)'}}>█</span> ±2σ — less likely</li>
                        <li><span style={{color: 'hsl(55, 85%, 50%)'}}>█</span> ±3σ — rare outcomes</li>
                      </ul>
                      <p className="mt-1">X-axis labels show the center value of each bin.</p>
                      <p className="mt-1">Vertical lines show:</p>
                      <ul className="list-disc list-inside ml-4">
                        <li>Mean (μ)</li>
                        <li>Median</li>
                        <li>±1σ, ±2σ, ±3σ</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-base mb-1">🧠 Use Cases</h3>
                      <div className="space-y-1">
                        <p><strong>Business Viability:</strong> <code>50000~80000 * 0.1~0.2 * 5~10 - 20000~50000</code></p>
                        <p><strong>Income Forecasting:</strong> <code>1000~1500 * 12~14 * (1 - 0.3~0.4)</code></p>
                        <p><strong>Time Saved Estimate:</strong> <code>(3~5 * 5~10 * 52) / 60 - 10~15</code></p>
                        <p><strong>Investment Return:</strong> <code>10000 * (1 + -0.05~0.15)^5</code></p>
                        <p><strong>Risk of Infection:</strong> <code>(10~30 / 100) * (0.1~1.0 / 100) * 1000000</code></p>
                        <p><strong>Geometry/Physics:</strong> <code>pi * (4~6)^2</code>, <code>2 * pi * (10~12)</code></p>
                      </div>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction>Got it!</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <CardDescription>
            Enter expressions with ranges (e.g., 100~120) for probabilistic simulation.
            Vertical lines indicate Mean, Median, and Standard Deviations (σ).
            Histogram bars are colored based on their distance from the mean (±1σ, ±2σ, ±3σ).
            X-axis labels show the center value of each bin.
          </CardDescription>
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
                onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 100000))} // Ensure fallback uses 100000
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

    
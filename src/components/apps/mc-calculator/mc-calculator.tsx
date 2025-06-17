
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
import { Terminal, CornerDownLeft, History, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { format } from 'timeago.js';

interface HistoryItem {
  id: string;
  expression: string;
  resultDisplay: string;
  timestamp: number;
}

const MAX_HISTORY_ITEMS = 20;

export default function MCCalculator() {
  const [expression, setExpression] = useState("");
  const [iterations, setIterations] = useState(100000);
  const [histogramBins, setHistogramBins] = useState(23);
  const [submittedExpression, setSubmittedExpression] = useState("");
  const [submittedIterations, setSubmittedIterations] = useState(0);
  const [submittedHistogramBins, setSubmittedHistogramBins] = useState(histogramBins);
  const [isClient, setIsClient] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);


  useEffect(() => {
    setIsClient(true);
    const storedHistory = localStorage.getItem("mcCalculatorHistory");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const result = useCalculator(
    submittedExpression,
    submittedIterations > 0 ? submittedIterations : 1,
    submittedHistogramBins
  );

  useEffect(() => {
    if (submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)))) {
      let resultDisplay = "N/A";
      if (result.isDeterministic) {
        resultDisplay = formatDetailedNumber(result.results[0]);
      } else if (result.results && result.results.length > 0 && !isNaN(result.mean)) {
        resultDisplay = `μ: ${formatNumber(result.mean)}`;
      }

      if (resultDisplay !== "N/A") {
        setHistory(prevHistory => {
          const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            expression: submittedExpression,
            resultDisplay,
            timestamp: Date.now(),
          };
          const updatedHistory = [newHistoryItem, ...prevHistory.filter(item => item.expression !== submittedExpression)].slice(0, MAX_HISTORY_ITEMS);
          localStorage.setItem("mcCalculatorHistory", JSON.stringify(updatedHistory));
          return updatedHistory;
        });
      }
    }
  }, [result, submittedExpression]);

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

  const handleAllClear = () => {
    setExpression("");
    setSubmittedExpression("");
    setSubmittedIterations(0);
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
    if (absNum >= 1_000) {
      return sign + (absNum / 1_000).toFixed(1) + "K";
    }
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const formatDetailedNumber = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return "N/A";
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const handleHistoryItemClick = (expr: string) => {
    setExpression(expr);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("mcCalculatorHistory");
    setShowHistory(false);
  };

  const renderDeterministicOutput = (calcResult: CalculatorResults) => (
    <div className="text-3xl font-bold text-primary py-4 bg-muted/30 p-6 rounded-md text-left shadow-inner">
      {formatDetailedNumber(calcResult.results[0])}
    </div>
  );

  const showResultsArea = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showTrueRangeConditionally = showResultsArea && !result.isDeterministic && (!isNaN(result.analyticalMin) || !isNaN(result.analyticalMax));


  const renderProbabilisticOutput = (calcResult: CalculatorResults) => (
    <div className="flex flex-col lg:flex-row gap-0">
      <div className="lg:w-[180px] space-y-4 text-xs shrink-0">

        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="iterations-input-ctrl-prob" className="text-xs text-muted-foreground whitespace-nowrap">Iterations</Label>
              <Input
                id="iterations-input-ctrl-prob"
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Math.max(100, parseInt(e.target.value, 10) || 100000))}
                className="w-24 h-8 text-xs"
                min="100"
                step="1000"
              />
            </div>
            <div>
              <Label htmlFor="histogram-bins-slider-ctrl-prob" className="text-xs text-muted-foreground whitespace-nowrap">
                Bars: {histogramBins}
              </Label>
              <Slider
                id="histogram-bins-slider-ctrl-prob"
                min={5}
                max={50}
                step={1}
                value={[histogramBins]}
                onValueChange={(value) => setHistogramBins(value[0])}
                className="w-full mt-1"
              />
            </div>
        </div>

        <hr className="my-2 border-border/50"/>

        <p><strong>Simulated Range:</strong><br/>{formatNumber(calcResult.min)} ~ {formatNumber(calcResult.max)}</p>
        <p><strong>Mean (μ):</strong> {formatNumber(calcResult.mean)}</p>
        <p><strong>Std Dev (σ):</strong> {formatNumber(calcResult.stdDev)}</p>
        <hr className="my-2 border-border/50"/>
        <p><strong>P5:</strong> {formatNumber(calcResult.p5)}</p>
        <p><strong>P10:</strong> {formatNumber(calcResult.p10)}</p>
        <p><strong>P25:</strong> {formatNumber(calcResult.p25)}</p>
        <p><strong>Median (P50):</strong> {formatNumber(calcResult.p50)}</p>
        <p><strong>P75:</strong> {formatNumber(calcResult.p75)}</p>
        <p><strong>P90:</strong> {formatNumber(calcResult.p90)}</p>
        <p><strong>P95:</strong> {formatNumber(calcResult.p95)}</p>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
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
      </div>
    </div>
  );


  return (
    <div className="h-full w-full flex flex-col">
      <div className="overflow-clip p-4 space-y-4 min-h-0">
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
            <Popover open={showHistory} onOpenChange={setShowHistory}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 hover:bg-green-900" aria-label="Toggle History">
                  <History className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[400px] z-[925] p-2 max-h-[266px] overflow-y-auto"
                align="end"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No history yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="cursor-pointer hover:bg-muted p-2 rounded-md"
                          onClick={() => handleHistoryItemClick(item.expression)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-foreground truncate pr-2" title={item.expression}>
                              {item.expression.length > 35 ? `${item.expression.substring(0, 32)}...` : item.expression}
                            </span>
                            <span className="text-xs text-primary whitespace-nowrap">{item.resultDisplay}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{format(item.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                    {history.length > 0 && (
                    <>
                      <hr className="my-2 border-border/50" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-xs"
                        onClick={handleClearHistory}
                      >
                        <Trash2 className="h-3 w-3 mr-1.5" />
                        Clear History
                      </Button>
                    </>
                  )}
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={handleAllClear} className="h-10 px-4 text-sm hover:bg-red-900">AC</Button>
            <Button
              onClick={handleCalculate}
              aria-label="Calculate"
              className="h-10 px-3"
            >
              <CornerDownLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 relative">
           <div className="absolute top-1 right-1 z-10">
             {/* Intentionally empty or for future use, history button was here */}
           </div>
            <div className="flex flex-row items-start gap-x-6 gap-y-4 mt-3">
                {showTrueRangeConditionally && (
                    <div className="flex flex-col space-y-1">
                    <Label htmlFor="true-range-display" className="text-muted-foreground text-lg">True Range</Label>
                    <p id="true-range-display" className="text-foreground font-medium whitespace-nowrap text-lg">
                        {formatDetailedNumber(result.analyticalMin)} ~ {formatDetailedNumber(result.analyticalMax)}
                    </p>
                    {result.analyticalError && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 max-w-[200px] truncate" title={result.analyticalError}>
                            {result.analyticalError}
                        </p>
                    )}
                    </div>
                )}
            </div>

            {result.error && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
            </Alert>
            )}

            {showResultsArea && result.isDeterministic && renderDeterministicOutput(result)}
            {showResultsArea && !result.isDeterministic && renderProbabilisticOutput(result)}
        </div>
      </div>
    </div>
  );
}

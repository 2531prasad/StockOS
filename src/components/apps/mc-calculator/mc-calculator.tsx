
"use client";
import React, { useState, useEffect } from "react";
import { useCalculator, type CalculatorResults, type HistogramDataEntry } from "./hooks/useCalculator";
import Histogram from "./components/Histogram";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Terminal, History as HistoryIcon, Trash2 } from "lucide-react";
import { format as formatTimeAgo } from 'timeago.js';

interface HistoryEntry {
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

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const result = useCalculator(
    submittedExpression,
    submittedIterations > 0 ? submittedIterations : 1, 
    submittedHistogramBins
  );

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

  useEffect(() => {
    if (submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)))) {
      let resultDisplay = "N/A";
      if (result.isDeterministic && result.results[0] !== undefined && !isNaN(result.results[0])) {
        resultDisplay = formatDetailedNumber(result.results[0]);
      } else if (!result.isDeterministic && result.mean !== undefined && !isNaN(result.mean)) {
        resultDisplay = `μ: ${formatNumber(result.mean)}`;
      }

      if (resultDisplay !== "N/A") {
        const newEntry: HistoryEntry = {
          id: crypto.randomUUID(),
          expression: submittedExpression,
          resultDisplay: resultDisplay,
          timestamp: Date.now(),
        };
        setHistory(prev => [newEntry, ...prev.filter(item => item.expression !== newEntry.expression)].slice(0, MAX_HISTORY_ITEMS));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.results, result.error, result.isDeterministic, result.mean, submittedExpression]);


  const renderDeterministicOutput = (calcResult: CalculatorResults) => (
    <div className="text-3xl font-bold text-primary py-4 bg-muted/30 p-6 rounded-md text-left shadow-inner">
      {formatDetailedNumber(calcResult.results[0])}
    </div>
  );

  const showResultsArea = submittedExpression && !result.error && (result.isDeterministic || (result.results && result.results.length > 0 && !result.results.every(isNaN)));
  const showTrueRangeConditionally = showResultsArea && !result.isDeterministic && (!isNaN(result.analyticalMin) || !isNaN(result.analyticalMax));


  const renderProbabilisticOutput = (calcResult: CalculatorResults) => (
    <div className="flex flex-col lg:flex-row gap-0">
      {/* Left Column: Controls and Statistics */}
      <div className="flex flex-col space-y-4 text-xs">
        
        {/* Controls Section */}
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
            <div className="flex flex-col">
              <Label htmlFor="histogram-bins-slider-ctrl-prob" className="text-xs text-muted-foreground whitespace-nowrap mb-1">
                Bars: {histogramBins}
              </Label>
              <Slider
                id="histogram-bins-slider-ctrl-prob"
                min={5}
                max={50}
                step={1}
                value={[histogramBins]}
                onValueChange={(value) => setHistogramBins(value[0])}
                className="w-full"
              />
            </div>
        </div>
        
        <hr className="my-2 border-border/50"/>

        {/* Statistics Section */}
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

      {/* Right Column: Histogram */}
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
      <div className="p-4 space-y-4 min-h-0 overflow-clip"> {/* Changed overflow-y-auto to overflow-clip */}
        {/* Inputs and Calculate Button Section */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <Input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="grow text-base h-10" 
            placeholder="e.g., 50~60 * 10 + (100~120)/2"
            aria-label="Expression Input"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
          />
          <Button onClick={handleCalculate} className="text-base h-10">Calculate</Button>
          <Popover open={showHistory} onOpenChange={setShowHistory}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <HistoryIcon className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 z-[925]" align="end" sideOffset={5}>
              <div className="p-2">
                {history.length === 0 && (
                  <p className="text-muted-foreground text-center py-4 text-sm">No history yet.</p>
                )}
                {history.length > 0 && (
                  <ScrollArea className="h-auto max-h-[250px] rounded-md">
                    <div className="space-y-1">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="cursor-pointer hover:bg-accent/75 p-2 rounded-md flex justify-between items-start gap-2"
                          onClick={() => {
                            setExpression(item.expression);
                            setShowHistory(false);
                          }}
                          title={`Click to use: ${item.expression}`}
                        >
                          <div className="flex-grow min-w-0">
                            <p className="text-xs text-muted-foreground truncate" title={item.expression}>{item.expression}</p>
                            <p className="text-sm font-medium text-foreground">{item.resultDisplay}</p>
                          </div>
                          <span className="text-xs text-muted-foreground/80 flex-shrink-0 pt-0.5 whitespace-nowrap">
                            {isClient ? formatTimeAgo(item.timestamp) : '...'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                {history.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start px-2"
                      onClick={() => {
                        setHistory([]);
                      }}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Clear History
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Control Row: True Range */}
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


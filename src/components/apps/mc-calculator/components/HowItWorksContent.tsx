
"use client";
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function HowItWorksContent() {
  return (
    <ScrollArea className="max-h-[calc(75vh-80px)]">
      <div className="text-sm text-muted-foreground text-left p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-base mb-1 text-card-foreground">🚀 What This Calculator Does</h3>
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
          <h3 className="font-semibold text-base mb-1 text-card-foreground">✍️ Expression Syntax</h3>
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
          <p className="mt-2"><strong>Commas:</strong> Commas in numbers are ignored (e.g. <code>1,000</code> is treated as <code>1000</code>).</p>
          <p className="mt-1"><strong>True Analytical Range:</strong> For expressions with many ranges (&gt;8), the analytical range is an approximation. For fewer ranges, it's calculated by checking all 2<sup>N</sup> min/max combinations.</p>
        </div>

        <div>
          <h3 className="font-semibold text-base mb-1 text-card-foreground">📈 Interpreting the Results</h3>
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
          <h3 className="font-semibold text-base mb-1 text-card-foreground">🎨 Histogram Features</h3>
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
          <h3 className="font-semibold text-base mb-1 text-card-foreground">🧠 Use Cases</h3>
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
    </ScrollArea>
  );
}

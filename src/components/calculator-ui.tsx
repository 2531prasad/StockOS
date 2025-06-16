import React from 'react';
import { Button } from "@/components/ui/button";

interface CalculatorUIProps {
  displayValue: string;
  onDigitClick: (digit: string) => void;
  onOperatorClick: (operator: string) => void;
  onEqualsClick: () => void;
  onClearClick: () => void;
  onDecimalClick: () => void;
}

const buttonBaseClass = "text-xl font-medium h-16 transform transition-transform active:scale-95 shadow-xs hover:shadow-md focus:ring-2 focus:ring-ring focus:ring-offset-1";

export function CalculatorUI({
  displayValue,
  onDigitClick,
  onOperatorClick,
  onEqualsClick,
  onClearClick,
  onDecimalClick,
}: CalculatorUIProps) {
  return (
    <div className="p-3 bg-card rounded-b-lg">
      <div 
        aria-label="Calculator display"
        className="h-20 px-4 py-2 mb-3 text-4xl font-mono text-right rounded bg-accent/30 text-accent-foreground flex items-center justify-end overflow-hidden"
      >
        <span className="truncate block">{displayValue}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1 */}
        <Button onClick={onClearClick} variant="destructive" className={`${buttonBaseClass} col-span-2`}>C</Button>
        <Button onClick={() => onOperatorClick('/')} variant="outline" className={`${buttonBaseClass} bg-primary/20 hover:bg-primary/30 text-primary`}>÷</Button>
        <Button onClick={() => onOperatorClick('*')} variant="outline" className={`${buttonBaseClass} bg-primary/20 hover:bg-primary/30 text-primary`}>×</Button>

        {/* Row 2 */}
        <Button onClick={() => onDigitClick('7')} variant="secondary" className={`${buttonBaseClass}` }>7</Button>
        <Button onClick={() => onDigitClick('8')} variant="secondary" className={`${buttonBaseClass}` }>8</Button>
        <Button onClick={() => onDigitClick('9')} variant="secondary" className={`${buttonBaseClass}` }>9</Button>
        <Button onClick={() => onOperatorClick('-')} variant="outline" className={`${buttonBaseClass} bg-primary/20 hover:bg-primary/30 text-primary`}>−</Button>

        {/* Row 3 */}
        <Button onClick={() => onDigitClick('4')} variant="secondary" className={`${buttonBaseClass}` }>4</Button>
        <Button onClick={() => onDigitClick('5')} variant="secondary" className={`${buttonBaseClass}` }>5</Button>
        <Button onClick={() => onDigitClick('6')} variant="secondary" className={`${buttonBaseClass}` }>6</Button>
        <Button onClick={() => onOperatorClick('+')} variant="outline" className={`${buttonBaseClass} bg-primary/20 hover:bg-primary/30 text-primary`}>+</Button>

        {/* Row 4 */}
        <Button onClick={() => onDigitClick('1')} variant="secondary" className={`${buttonBaseClass}` }>1</Button>
        <Button onClick={() => onDigitClick('2')} variant="secondary" className={`${buttonBaseClass}` }>2</Button>
        <Button onClick={() => onDigitClick('3')} variant="secondary" className={`${buttonBaseClass}` }>3</Button>
        <Button onClick={onEqualsClick} variant="default" className={`${buttonBaseClass} row-span-2 bg-primary hover:bg-primary/90 text-primary-foreground`}>=</Button>
        
        {/* Row 5 */}
        <Button onClick={() => onDigitClick('0')} variant="secondary" className={`${buttonBaseClass} col-span-2`}>0</Button>
        <Button onClick={onDecimalClick} variant="secondary" className={`${buttonBaseClass}` }>.</Button>
      </div>
    </div>
  );
}

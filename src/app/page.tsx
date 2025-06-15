"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalculatorUI } from '@/components/calculator-ui';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { MoveIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const MAX_DISPLAY_LENGTH = 16;

export default function FloatCalcPage() {
  const [currentOperand, setCurrentOperand] = useState<string>("0");
  const [previousOperand, setPreviousOperand] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState<boolean>(true); // True to overwrite currentOperand with new input
  const [errorState, setErrorState] = useState<string | null>(null);

  const { toast } = useToast();

  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      return { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 250 }; // Center roughly
    }
    return { x: 100, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const calculatorRef = useRef<HTMLDivElement>(null);

  const formatDisplayValue = (value: string | number | null): string => {
    if (value === null) return "0";
    let stringValue = String(value);
    if (errorState) return errorState;
    if (stringValue.length > MAX_DISPLAY_LENGTH) {
      try {
        const num = parseFloat(stringValue);
        if (Math.abs(num) > 1e15 || (Math.abs(num) < 1e-9 && num !== 0)) {
           return num.toExponential(MAX_DISPLAY_LENGTH - 6); // 6 for "e+NN" or "e-NN"
        }
        // Truncate if it's too long but not suitable for exponential
        return stringValue.substring(0, MAX_DISPLAY_LENGTH);

      } catch {
        return "Error";
      }
    }
    return stringValue;
  };
  
  const clear = useCallback(() => {
    setCurrentOperand("0");
    setPreviousOperand(null);
    setOperation(null);
    setOverwrite(true);
    setErrorState(null);
  }, []);

  const performCalculation = (): number | null => {
    const prev = parseFloat(previousOperand!);
    const current = parseFloat(currentOperand);
    if (isNaN(prev) || isNaN(current)) return null;

    let result: number;
    switch (operation) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '*': result = prev * current; break;
      case '/':
        if (current === 0) {
          setErrorState("Div by Zero");
          return null;
        }
        result = prev / current;
        break;
      default: return null;
    }
    return result;
  };

  const handleEquals = useCallback(() => {
    if (operation === null || previousOperand === null) return;
    
    const result = performCalculation();
    if (result === null && !errorState) { // if errorState is already set (e.g. Div by Zero)
      setErrorState("Error");
      setCurrentOperand("Error");
    } else if (result !== null) {
      setCurrentOperand(String(result));
      setErrorState(null);
    }
    
    setOperation(null);
    setPreviousOperand(null);
    setOverwrite(true);
  }, [operation, previousOperand, currentOperand, errorState]);


  const chooseOperation = useCallback((op: string) => {
    if (errorState) clear();
    if (currentOperand === "" && previousOperand === null) return;

    if (previousOperand !== null && operation !== null && !overwrite) {
      const result = performCalculation();
      if (result === null) {
        if (!errorState) setErrorState("Error");
        setPreviousOperand(null);
        setCurrentOperand(errorState || "Error");
        setOperation(op);
        setOverwrite(true);
        return;
      }
      setPreviousOperand(String(result));
      setCurrentOperand(String(result)); 
    } else if (previousOperand === null) {
      setPreviousOperand(currentOperand);
    }
    
    setOperation(op);
    setOverwrite(true);
    setErrorState(null);
  }, [currentOperand, previousOperand, operation, errorState, clear, overwrite]);


  const appendDigit = useCallback((digit: string) => {
    if (errorState) clear();
    if (overwrite) {
      setCurrentOperand(digit);
      setOverwrite(false);
    } else {
      if (currentOperand.length >= MAX_DISPLAY_LENGTH) return;
      setCurrentOperand(currentOperand + digit);
    }
    setErrorState(null);
  }, [currentOperand, overwrite, errorState, clear]);

  const appendDecimal = useCallback(() => {
    if (errorState) clear();
    if (overwrite) {
      setCurrentOperand("0.");
      setOverwrite(false);
      return;
    }
    if (currentOperand.includes('.')) return;
    if (currentOperand.length >= MAX_DISPLAY_LENGTH -1) return; // Account for the dot
    setCurrentOperand(currentOperand + '.');
    setErrorState(null);
  }, [currentOperand, overwrite, errorState, clear]);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (errorState && event.key !== 'Escape' && event.key.toLowerCase() !== 'c') return;

    if (event.key >= '0' && event.key <= '9') {
      appendDigit(event.key);
    } else if (event.key === '.') {
      appendDecimal();
    } else if (event.key === '+' || event.key === '-' || event.key === '*' || event.key === '/') {
      chooseOperation(event.key);
    } else if (event.key === 'Enter' || event.key === '=') {
      handleEquals();
    } else if (event.key === 'Escape' || event.key.toLowerCase() === 'c') {
      clear();
    } else if (event.key === 'Backspace') {
      // Optional: implement backspace
      if (errorState) {
        clear();
      } else if (!overwrite && currentOperand.length > 0) {
        const newOperand = currentOperand.slice(0, -1);
        setCurrentOperand(newOperand === "" || newOperand === "-" ? "0" : newOperand);
        if (newOperand === "" || newOperand === "-") setOverwrite(true);
      }
    }
  }, [appendDigit, appendDecimal, chooseOperation, handleEquals, clear, errorState, currentOperand, overwrite]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const onMouseDownDraggable = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calculatorRef.current) return;
    setIsDragging(true);
    const rect = calculatorRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // Prevent text selection while dragging
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  useEffect(() => {
    // This effect handles displaying errors from external sources if needed,
    // or reacting to internal error states for more complex UI.
    if (errorState && errorState !== "Div by Zero" && errorState !== "Error") { // "Div by Zero" and "Error" are displayed directly
      toast({
        title: "Calculator Error",
        description: errorState,
        variant: "destructive",
      });
    }
  }, [errorState, toast]);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-background font-body">
      <Card
        ref={calculatorRef}
        className="fixed shadow-2xl rounded-lg w-[300px] sm:w-[320px] border border-primary/30"
        style={{ 
          top: position.y, 
          left: position.x, 
          cursor: isDragging ? 'grabbing' : 'default', // Default cursor for card, grab for header
          touchAction: 'none' // Prevent page scroll on touch devices while dragging
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Floating Calculator"
      >
        <CardHeader
          className="p-2 h-10 flex flex-row items-center justify-between bg-muted/30 rounded-t-lg border-b border-primary/20"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDownDraggable}
          aria-roledescription="Draggable calculator header. Press and hold to move."
          tabIndex={0} // Make it focusable for accessibility
        >
          <h2 className="text-sm font-semibold text-muted-foreground select-none">FloatCalc</h2>
          <MoveIcon className="w-4 h-4 text-muted-foreground select-none" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-0">
          <CalculatorUI
            displayValue={formatDisplayValue(errorState || currentOperand)}
            onDigitClick={appendDigit}
            onOperatorClick={chooseOperation}
            onEqualsClick={handleEquals}
            onClearClick={clear}
            onDecimalClick={appendDecimal}
          />
        </CardContent>
      </Card>
       {/* Instruction Text */}
       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-card/80 rounded-md shadow-md text-center text-sm text-foreground/80">
        <p className="font-semibold">Welcome to FloatCalc!</p>
        <p>Drag the title bar to move. Use your keyboard or click buttons.</p>
        <p className="mt-1 text-xs">(Esc or C to clear, Enter to calculate)</p>
      </div>
    </div>
  );
}

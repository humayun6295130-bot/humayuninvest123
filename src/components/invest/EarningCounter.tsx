
'use client';

import { useState, useEffect, useRef } from 'react';

interface EarningCounterProps {
  initialAmount: number;
}

// Assumes the investment doubles in 30 days.
const SECONDS_IN_MONTH = 30 * 24 * 60 * 60;
const EARNING_RATE_PER_SECOND_FACTOR = 1 / SECONDS_IN_MONTH;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6, // Show small increments
      maximumFractionDigits: 6,
    }).format(value);
};

export function EarningCounter({ initialAmount }: EarningCounterProps) {
  const [currentValue, setCurrentValue] = useState(initialAmount);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Set start time only once on the client to avoid hydration mismatch
    if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (startTimeRef.current === null) return;
      
      const elapsedTimeInSeconds = (Date.now() - startTimeRef.current) / 1000;
      const earnings = initialAmount * EARNING_RATE_PER_SECOND_FACTOR * elapsedTimeInSeconds;
      setCurrentValue(initialAmount + earnings);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [initialAmount]);

  return (
    <div className="mt-4 p-4 bg-muted/20 rounded-lg text-center border border-dashed">
        <p className="text-sm text-muted-foreground">Simulated Earnings</p>
        <p className="text-2xl font-bold font-mono text-primary">
            {formatCurrency(currentValue)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">This is a simulation of potential earnings.</p>
    </div>
  );
}

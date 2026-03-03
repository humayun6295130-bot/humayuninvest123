'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays, addDays } from 'date-fns';

interface InvestmentProgressProps {
    amount: number;
    totalReturn: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'cancelled';
}

export function InvestmentProgress({
    amount,
    totalReturn,
    startDate,
    endDate,
    status,
}: InvestmentProgressProps) {
    const [currentValue, setCurrentValue] = useState(0); // Start from 0 profit
    const [progress, setProgress] = useState(0);
    const [daysLeft, setDaysLeft] = useState(0);
    const [daysPassed, setDaysPassed] = useState(0);
    const [dailyProfit, setDailyProfit] = useState(0);

    useEffect(() => {
        const calculateProgress = () => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const now = new Date();

            const totalDuration = differenceInDays(end, start);
            const passed = differenceInDays(now, start);
            const remaining = differenceInDays(end, now);

            setDaysPassed(Math.max(0, passed));
            setDaysLeft(Math.max(0, remaining));

            // Calculate progress percentage (0-100)
            const progressPercent = Math.min(100, Math.max(0, (passed / totalDuration) * 100));
            setProgress(progressPercent);

            // Calculate profit (starts from 0, grows to 100% of amount)
            // Total profit = amount (100% return)
            const totalProfit = amount; // 100% of investment
            const currentProfit = (totalProfit * progressPercent) / 100;
            setCurrentValue(currentProfit);

            // Daily profit = totalProfit / 30 days
            setDailyProfit(totalProfit / 30);
        };

        calculateProgress();
        const interval = setInterval(calculateProgress, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [startDate, endDate, amount, totalReturn]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    if (status === 'completed') {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                    <div className="text-center">
                        <p className="text-sm text-green-600 font-medium">100% Return Received</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(amount)}</p>
                        <p className="text-xs text-green-600">Profit Credited</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (status === 'cancelled') {
        return (
            <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                    <div className="text-center">
                        <p className="text-sm text-red-600 font-medium">Investment Cancelled</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(amount)}</p>
                        <p className="text-xs text-red-600">Principal Returned</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
                {/* Current Profit */}
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Accumulated Profit</p>
                    <p className="text-2xl font-bold text-primary font-mono">
                        {formatCurrency(currentValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        of {formatCurrency(amount)} target (100%)
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>$0</span>
                        <span>{formatCurrency(amount)}</span>
                    </div>
                </div>

                {/* Daily Profit */}
                <div className="text-center bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Daily Profit</p>
                    <p className="text-lg font-semibold text-green-600">+{formatCurrency(dailyProfit)}</p>
                </div>

                {/* Time Info */}
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">Days Passed</p>
                        <p className="text-lg font-bold">{daysPassed}</p>
                    </div>
                    <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">Days Left</p>
                        <p className="text-lg font-bold">{daysLeft}</p>
                    </div>
                </div>

                {/* Progress Percentage */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Progress: <span className="font-medium text-primary">{progress.toFixed(1)}%</span>
                    </p>
                </div>

                {/* End Date */}
                <div className="text-center text-xs text-muted-foreground">
                    End Date: {format(new Date(endDate), 'MMM d, yyyy')}
                </div>
            </CardContent>
        </Card>
    );
}

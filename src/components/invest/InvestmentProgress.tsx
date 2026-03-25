'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';

interface InvestmentProgressProps {
    amount: number;
    totalReturn: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'cancelled';
}

export function InvestmentProgress({
    amount,
    startDate,
    status,
}: InvestmentProgressProps) {
    const [daysActive, setDaysActive] = useState(0);

    useEffect(() => {
        const calculate = () => {
            const start = new Date(startDate);
            const now = new Date();
            const passed = differenceInDays(now, start);
            setDaysActive(Math.max(0, passed));
        };
        calculate();
        const interval = setInterval(calculate, 60000);
        return () => clearInterval(interval);
    }, [startDate]);

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
                        <p className="text-sm text-green-600 font-medium">Investment Completed</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(amount)}</p>
                        <p className="text-xs text-green-600">Principal Credited</p>
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
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-background rounded p-3">
                        <p className="text-xs text-muted-foreground">Invested</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(amount)}</p>
                    </div>
                    <div className="bg-background rounded p-3">
                        <p className="text-xs text-muted-foreground">Days Active</p>
                        <p className="text-lg font-bold">{daysActive}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

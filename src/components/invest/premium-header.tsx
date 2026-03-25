"use client";

import { Wallet } from "lucide-react";

interface PremiumHeaderProps {
    balance: number;
    userName?: string;
}

export function PremiumHeader({ balance, userName }: PremiumHeaderProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="font-headline text-3xl font-bold text-foreground tracking-tight">
                    Investment Center
                </h1>
                <p className="text-muted-foreground mt-1">
                    {userName ? `Welcome back, ${userName}` : 'Grow your wealth strategically'}
                </p>
            </div>

            {/* Balance Card - Minimal Design */}
            <div className="premium-card py-3 px-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium">Available Balance</p>
                    <p className="text-xl font-headline font-bold text-foreground">
                        {formatCurrency(balance)}
                    </p>
                </div>
            </div>
        </div>
    );
}

interface StatsCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'success' | 'warning';
}

export function StatsCard({ label, value, subValue, icon, variant = 'default' }: StatsCardProps) {
    const variantClasses = {
        default: 'text-foreground',
        success: 'text-green-400',
        warning: 'text-yellow-600',
    };

    return (
        <div className="premium-card p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
                    <p className={cn("text-2xl font-headline font-bold", variantClasses[variant])}>
                        {value}
                    </p>
                    {subValue && (
                        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
                    )}
                </div>
                {icon && (
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper for cn
import { cn } from "@/lib/utils";
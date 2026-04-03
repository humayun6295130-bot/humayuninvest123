"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface InvestmentPlan {
    id: string;
    name: string;
    description: string;
    min_amount: number;
    max_amount: number;
    daily_roi_percent: number;
    return_percent: number;
    duration_days: number;
    capital_return: boolean;
    category?: string;
    features?: string[];
    fixed_amount?: number;
    custom_amount?: boolean;
    total_return?: number;
    profit_amount?: number;
    payout_schedule?: 'daily' | 'end_of_term';
    is_verified?: boolean;
}

/** Align plan chip text with landing / payment dialog (no fixed "30 days = $X" implication). */
function normalizePlanFeatureLabel(raw: string): string {
    const s = raw.trim();
    if (/^\d+\s*days?\s*duration$/i.test(s)) return "Up to 60X";
    if (/\bduration\b/i.test(s) && /\b\d+\s*days?\b/i.test(s)) return "Up to 60X";
    return s;
}

interface PremiumInvestmentCardProps {
    plan: InvestmentPlan;
    onSelect: (plan: InvestmentPlan) => void;
    index: number;
}

// Generate sparkline data based on plan performance (deterministic - no Math.random)
const generateSparklineData = (plan: InvestmentPlan): number[] => {
    const points = 12; // 12 months
    const baseValue = 100;
    const dailyRoi = plan.daily_roi_percent;

    // Deterministic variance per index to avoid hydration mismatch
    const data = [];
    let currentValue = baseValue;

    for (let i = 0; i < points; i++) {
        const variance = (((i * 13 + 7) % 20) / 20 - 0.35) * 1.5;
        const growth = (dailyRoi * 30) / 100 + variance;
        currentValue = currentValue * (1 + growth / 100);
        data.push(Math.max(baseValue, currentValue));
    }

    return data;
};

// SVG Sparkline Component
function SparklineChart({ data }: { data: number[] }) {
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue || 1;

    const width = 120;
    const height = 40;
    const padding = 4;

    const points = data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(" ");

    const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <defs>
                <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={areaPoints} fill="url(#sparklineGradient)" />
            <polyline
                points={points}
                fill="none"
                stroke="#F97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Verified Badge Component
function VerifiedBadge({ className }: { className?: string }) {
    return (
        <span className={cn("verified-badge", className)}>
            <CheckCircle className="w-3 h-3" />
            Verified
        </span>
    );
}

// Info Tooltip Component
function InfoTooltip({ content }: { content: string }) {
    return (
        <div className="tooltip-wrapper">
            <span className="tooltip-trigger">i</span>
            <div className="tooltip-panel">
                {content}
            </div>
        </div>
    );
}

export function PremiumInvestmentCard({ plan, onSelect, index }: PremiumInvestmentCardProps) {
    const sparklineData = useMemo(() => generateSparklineData(plan), [plan]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const staggerClass = `stagger-${Math.min(index + 1, 10)}`;

    return (
        <div
            className={cn(
                "investment-card group cursor-pointer",
                "stagger-enter",
                staggerClass
            )}
            onClick={() => onSelect(plan)}
        >
            {/* Header - Title and Category */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-headline text-lg font-bold text-foreground leading-tight tracking-tight">
                            {plan.name}
                        </h3>
                        {plan.is_verified && <VerifiedBadge />}
                    </div>
                    {plan.category && (
                        <span className="category-pill">
                            {plan.category}
                        </span>
                    )}
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {plan.description}
            </p>

            {/* Sparkline Chart */}
            <div className="sparkline-container mb-4">
                <SparklineChart data={sparklineData} />
            </div>

            <div className="metric-grid">
                <div className="metric-item">
                    <div className="flex items-center gap-1">
                        <span className="metric-label">Min Entry</span>
                        <InfoTooltip content="Minimum investment amount" />
                    </div>
                    <span className="metric-value">
                        {plan.fixed_amount ? formatCurrency(plan.fixed_amount) : formatCurrency(plan.min_amount)}
                    </span>
                </div>
            </div>

            {/* Features (if any) */}
            {plan.features && plan.features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                    <div className="flex flex-wrap gap-2">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                            <span
                                key={idx}
                                className="text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded-md"
                            >
                                {normalizePlanFeatureLabel(feature)}
                            </span>
                        ))}
                        {plan.features.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                                +{plan.features.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
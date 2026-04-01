"use client";

/**
 * Daily Profit Claim Component
 * 
 * Features:
 * - Shows daily claimable profit from active investments
 * - One claim per day
 * - Tracks claimed amount
 * - Shows accumulated profit
 */

import { useState, useEffect, useMemo } from "react";
import { useUser, useRealtimeCollection, updateRow, insertRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, startOfDay, format } from "date-fns";
import { getEffectiveDailyIncomeUsd, resolveDailyIncomeForDeposit } from "@/lib/deposit-income-tiers";
import {
    Coins,
    Clock,
    CheckCircle,
    TrendingUp,
    Calendar,
    Gift,
    Loader2,
    Wallet
} from "lucide-react";

interface UserInvestment {
    id: string;
    plan_name: string;
    amount: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'cancelled';
    last_claim_date?: string;
    total_claimed: number;
    /** Dollar amount per day (preferred when set from plan activation) */
    daily_roi?: number;
    /** Plan daily % — used with amount when daily_roi missing */
    daily_roi_percent?: number;
}

interface DailyClaim {
    id: string;
    user_id: string;
    investment_id: string;
    amount: number;
    claimed_at: string;
    date: string;
}

export function DailyProfitClaim() {
    const { toast } = useToast();
    const { user, userProfile } = useUser();
    const [isClaiming, setIsClaiming] = useState(false);
    const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);

    // Fetch active investments
    const investmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [
            { column: 'user_id', operator: '==' as const, value: user.uid },
            { column: 'status', operator: '==' as const, value: 'active' }
        ] : [],
        enabled: !!user,
    }), [user]);

    // Fetch daily claims (no orderBy — avoids composite index requirement; sort client-side)
    const claimsOptions = useMemo(() => ({
        table: 'daily_profit_claims',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const { data: investments } = useRealtimeCollection<UserInvestment>(investmentsOptions);
    const { data: claimsRaw } = useRealtimeCollection<DailyClaim>(claimsOptions);

    const claims = useMemo(() => {
        if (!claimsRaw?.length) return claimsRaw;
        return [...claimsRaw].sort(
            (a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime()
        );
    }, [claimsRaw]);

    const calculateDailyProfit = (investment: UserInvestment): number =>
        getEffectiveDailyIncomeUsd(investment);

    const formatRoiLabel = (investment: UserInvestment): string => {
        const amt = Number(investment.amount) || 0;
        const perDay = calculateDailyProfit(investment);
        const tier = resolveDailyIncomeForDeposit(amt);
        if (tier.tierLevel > 0) return `${tier.incomePercent}%/day · $${perDay.toFixed(2)}`;
        return perDay > 0 ? `$${perDay.toFixed(2)}/day` : "—";
    };

    // Check if can claim today for an investment
    const canClaimToday = (investment: UserInvestment): boolean => {
        if (!investment.last_claim_date) return true;

        const lastClaim = startOfDay(new Date(investment.last_claim_date));
        const today = startOfDay(new Date());

        return differenceInDays(today, lastClaim) >= 1;
    };

    // Get next claim time
    const getNextClaimTime = (investment: UserInvestment): string => {
        if (!investment.last_claim_date) return "Now";

        const lastClaim = new Date(investment.last_claim_date);
        const nextClaim = new Date(lastClaim);
        nextClaim.setDate(nextClaim.getDate() + 1);
        nextClaim.setHours(0, 0, 0, 0);

        const now = new Date();
        if (now >= nextClaim) return "Now";

        return format(nextClaim, 'h:mm a');
    };

    // Calculate total claimable amount
    const totalClaimable = useMemo(() => {
        if (!investments) return 0;

        return investments.reduce((total, inv) => {
            if (canClaimToday(inv)) {
                return total + calculateDailyProfit(inv);
            }
            return total;
        }, 0);
    }, [investments]);

    // Calculate total accumulated profit
    const totalAccumulated = useMemo(() => {
        if (!investments) return 0;

        return investments.reduce((total, inv) => {
            const start = new Date(inv.start_date);
            const now = new Date();
            const daysPassed = Math.max(0, differenceInDays(now, start));
            const dailyProfit = calculateDailyProfit(inv);
            return total + (dailyProfit * daysPassed);
        }, 0);
    }, [investments]);

    // Calculate total claimed
    const totalClaimed = useMemo(() => {
        if (!claims) return 0;
        return claims.reduce((sum, claim) => sum + claim.amount, 0);
    }, [claims]);

    // Handle claim
    const handleClaim = async (investment: UserInvestment) => {
        if (!user || !canClaimToday(investment)) return;

        setIsClaiming(true);
        setSelectedInvestment(investment.id);

        try {
            const dailyProfit = calculateDailyProfit(investment);
            const today = format(new Date(), 'yyyy-MM-dd');

            // Create claim record
            await insertRow('daily_profit_claims', {
                user_id: user.uid,
                investment_id: investment.id,
                amount: dailyProfit,
                date: today,
                claimed_at: new Date().toISOString(),
            });

            // Update investment last claim date
            await updateRow('user_investments', investment.id, {
                last_claim_date: new Date().toISOString(),
                total_claimed: (investment.total_claimed || 0) + dailyProfit,
            });

            // Add to user balance
            await updateRow('users', user.uid, {
                balance: (userProfile?.balance || 0) + dailyProfit,
            });

            // Create transaction record
            await insertRow('transactions', {
                user_id: user.uid,
                user_email: userProfile?.email,
                user_display_name: userProfile?.display_name,
                type: 'daily_profit',
                amount: dailyProfit,
                currency: 'USD',
                status: 'completed',
                description: `Daily profit from ${investment.plan_name}`,
                metadata: {
                    investment_id: investment.id,
                    plan_name: investment.plan_name,
                },
            });

            toast({
                title: "Profit Claimed! 🎉",
                description: `You claimed $${dailyProfit.toFixed(2)} from ${investment.plan_name}`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Claim Failed",
                description: error.message || "Failed to claim profit",
            });
        } finally {
            setIsClaiming(false);
            setSelectedInvestment(null);
        }
    };

    // Handle claim all
    const handleClaimAll = async () => {
        if (!investments || !user) return;

        const claimableInvestments = investments.filter(inv => canClaimToday(inv));
        if (claimableInvestments.length === 0) return;

        setIsClaiming(true);

        try {
            let totalClaimedNow = 0;

            for (const investment of claimableInvestments) {
                const dailyProfit = calculateDailyProfit(investment);
                const today = format(new Date(), 'yyyy-MM-dd');

                await insertRow('daily_profit_claims', {
                    user_id: user.uid,
                    investment_id: investment.id,
                    amount: dailyProfit,
                    date: today,
                    claimed_at: new Date().toISOString(),
                });

                await updateRow('user_investments', investment.id, {
                    last_claim_date: new Date().toISOString(),
                    total_claimed: (investment.total_claimed || 0) + dailyProfit,
                });

                totalClaimedNow += dailyProfit;
            }

            // Update user balance once
            await updateRow('users', user.uid, {
                balance: (userProfile?.balance || 0) + totalClaimedNow,
            });

            toast({
                title: "All Profits Claimed! 🎉",
                description: `You claimed $${totalClaimedNow.toFixed(2)} total from ${claimableInvestments.length} investments`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Claim Failed",
                description: error.message || "Failed to claim profits",
            });
        } finally {
            setIsClaiming(false);
        }
    };

    if (!investments || investments.length === 0) {
        return null;
    }

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-primary" />
                        <CardTitle>Daily Profit Claim</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                        Daily % from your plan
                    </Badge>
                </div>
                <CardDescription>
                    Claim your daily profit from active investments
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Today's Profit</p>
                        <p className="text-xl font-bold text-green-600">+${totalClaimable.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Accumulated</p>
                        <p className="text-xl font-bold text-primary">${totalAccumulated.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Claimed</p>
                        <p className="text-xl font-bold">${totalClaimed.toFixed(2)}</p>
                    </div>
                </div>

                {/* Claim All Button */}
                {totalClaimable > 0 && (
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleClaimAll}
                        disabled={isClaiming}
                    >
                        {isClaiming ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Claiming...</>
                        ) : (
                            <><Gift className="w-4 h-4 mr-2" /> Claim All Profits (${totalClaimable.toFixed(2)})</>
                        )}
                    </Button>
                )}

                {/* Individual Investments */}
                <div className="space-y-3">
                    <p className="text-sm font-medium">Active Investments</p>
                    {investments.map((investment) => {
                        const dailyProfit = calculateDailyProfit(investment);
                        const canClaim = canClaimToday(investment);
                        const nextClaim = getNextClaimTime(investment);

                        return (
                            <div
                                key={investment.id}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${canClaim ? 'bg-green-100' : 'bg-gray-100'}`}>
                                        {canClaim ? (
                                            <Gift className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-gray-500" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{investment.plan_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatRoiLabel(investment)} · +${dailyProfit.toFixed(2)}/claim
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    {canClaim ? (
                                        <Button
                                            size="sm"
                                            onClick={() => handleClaim(investment)}
                                            disabled={isClaiming && selectedInvestment === investment.id}
                                        >
                                            {isClaiming && selectedInvestment === investment.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <><Coins className="w-3 h-3 mr-1" /> Claim</>
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Next: {nextClaim}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                    <p className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Profit accumulates daily. You can claim once per day per investment.
                    </p>
                    <p className="flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        Per-day amount uses the published deposit tiers (same as invest and claims).
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

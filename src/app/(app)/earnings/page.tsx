"use client";

import { useState, useMemo } from "react";
import { useUser, useRealtimeCollection } from "@/firebase";
import { db } from "@/firebase/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, DollarSign, Clock, CheckCircle2, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import Link from "next/link";
import { getEffectiveDailyIncomeUsd } from "@/lib/deposit-income-tiers";
import {
    DAILY_CLAIM_ERR,
    executeUnifiedDailyClaim,
    hasClaimedDailyToday,
} from "@/lib/daily-claim";

interface DailyEarning {
    id: string;
    amount: number;
    date: string;
    status: 'credited' | 'pending';
    created_at: string;
}

interface UserInvestment {
    id: string;
    plan_name: string;
    amount: number;
    daily_roi: number;
    income_percent?: number;
    earned_so_far: number;
    claimed_so_far?: number;
    days_claimed?: number;
    total_return: number;
    status: string;
}

export default function EarningsPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);

    const earningsOptions = useMemo(() => ({
        table: 'daily_earnings',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const investmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const { data: earningsRaw, isLoading: earningsLoading } = useRealtimeCollection<DailyEarning>(earningsOptions);

    const earnings = useMemo(() => {
        if (!earningsRaw?.length) return earningsRaw;
        return [...earningsRaw].sort(
            (a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
        );
    }, [earningsRaw]);
    const { data: investments, isLoading: investmentsLoading } = useRealtimeCollection<UserInvestment>(investmentsOptions);

    const activeInvestments = investments?.filter(inv => inv.status === 'active') || [];
    const totalDailyEarnings = activeInvestments.reduce(
        (sum, inv) => sum + getEffectiveDailyIncomeUsd(inv),
        0
    );
    const totalEarned = earnings?.filter(e => e.status === 'credited').reduce((sum, e) => sum + e.amount, 0) || 0;

    const lastClaimRaw = userProfile?.last_daily_claim;
    const lastClaimDate = lastClaimRaw ? new Date(lastClaimRaw) : null;
    const alreadyClaimedToday = hasClaimedDailyToday(lastClaimRaw);
    const hoursUntilNextClaim = lastClaimDate && alreadyClaimedToday
        ? Math.max(0, 24 - differenceInHours(new Date(), lastClaimDate))
        : 0;
    const minutesUntilNextClaim = lastClaimDate && alreadyClaimedToday
        ? Math.max(0, 60 - (differenceInMinutes(new Date(), lastClaimDate) % 60))
        : 0;

    const handleClaimROI = async () => {
        if (!user || !userProfile || !db) return;

        if (alreadyClaimedToday) {
            toast({
                variant: "destructive",
                title: "Already Claimed Today",
                description: `Next claim available in ${hoursUntilNextClaim}h ${minutesUntilNextClaim}m.`,
            });
            return;
        }

        if (totalDailyEarnings <= 0) {
            toast({
                variant: "destructive",
                title: "No Active Investments",
                description: "You need an active investment to claim daily income.",
            });
            return;
        }

        setIsClaiming(true);
        try {
            const { totalClaimed, activeCount } = await executeUnifiedDailyClaim({
                db,
                userId: user.uid,
                userProfile: {
                    last_daily_claim: userProfile.last_daily_claim,
                    email: userProfile.email,
                    display_name: userProfile.display_name,
                    username: userProfile.username,
                },
                investments: (investments || []) as any[],
            });

            toast({
                title: "Claimed",
                description: `$${totalClaimed.toFixed(2)} from ${activeCount} plan(s) added to your wallet balance.`,
            });
        } catch (error: any) {
            const msg = error?.message;
            if (msg === DAILY_CLAIM_ERR.ALREADY_TODAY) {
                toast({
                    variant: "destructive",
                    title: "Already Claimed Today",
                    description: `Next claim available in ${hoursUntilNextClaim}h ${minutesUntilNextClaim}m.`,
                });
            } else if (msg === DAILY_CLAIM_ERR.NOTHING) {
                toast({
                    variant: "destructive",
                    title: "No Active Investments",
                    description: "You need an active investment to claim daily income.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Claim Failed",
                    description: msg || "Something went wrong. Try again.",
                });
            }
        } finally {
            setIsClaiming(false);
        }
    };

    if (earningsLoading || investmentsLoading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-orange-400 mx-auto" />
                    <p className="text-slate-400">Loading earnings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">My Earnings</h1>
                    <p className="text-slate-400 text-sm mt-1">Claim daily income and track returns</p>
                </div>
                <Button
                    onClick={handleClaimROI}
                    disabled={isClaiming || alreadyClaimedToday || totalDailyEarnings <= 0}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-11 px-6 disabled:opacity-50"
                >
                    {isClaiming ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Claiming...</>
                    ) : alreadyClaimedToday ? (
                        <><Clock className="mr-2 h-4 w-4" />Claimed Today</>
                    ) : (
                        <><Zap className="mr-2 h-4 w-4" />Claim today</>
                    )}
                </Button>
            </div>

            {/* Claim Status Banner */}
            {activeInvestments.length > 0 && (
                <div className={`rounded-2xl border p-4 flex items-center gap-4 ${alreadyClaimedToday
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-orange-500/10 border-orange-500/30'}`}>
                    {alreadyClaimedToday ? (
                        <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
                    ) : (
                        <AlertCircle className="h-6 w-6 text-orange-400 shrink-0" />
                    )}
                    <div className="flex-1">
                        {alreadyClaimedToday ? (
                            <>
                                <p className="font-semibold text-green-400">Today&apos;s income already claimed</p>
                                <p className="text-sm text-slate-400">
                                    Next claim available in {hoursUntilNextClaim}h {minutesUntilNextClaim}m
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-semibold text-orange-400">Ready to claim</p>
                                <p className="text-sm text-slate-400">
                                    ${totalDailyEarnings.toFixed(2)} available from {activeInvestments.length} active investment{activeInvestments.length !== 1 ? 's' : ''}
                                </p>
                            </>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-white">${totalDailyEarnings.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">per day</p>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#111] border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-green-500/20 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-green-400" />
                            </div>
                            <span className="text-xs text-slate-400">Daily Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">+${totalDailyEarnings.toFixed(2)}</div>
                        <p className="text-xs text-slate-500 mt-1">Per day total</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-orange-500/20 rounded-lg">
                                <DollarSign className="h-4 w-4 text-orange-400" />
                            </div>
                            <span className="text-xs text-slate-400">Total Earned</span>
                        </div>
                        <div className="text-2xl font-bold text-white">${totalEarned.toFixed(2)}</div>
                        <p className="text-xs text-slate-500 mt-1">Lifetime claims</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                <Wallet className="h-4 w-4 text-blue-400" />
                            </div>
                            <span className="text-xs text-slate-400">Wallet Balance</span>
                        </div>
                        <div className="text-2xl font-bold text-white">${(userProfile?.balance || 0).toFixed(2)}</div>
                        <p className="text-xs text-slate-500 mt-1">Available balance</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-purple-500/20 rounded-lg">
                                <Clock className="h-4 w-4 text-purple-400" />
                            </div>
                            <span className="text-xs text-slate-400">Total Claims</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{earnings?.filter(e => e.status === 'credited').length || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Successful claims</p>
                    </CardContent>
                </Card>
            </div>

            {/* Active Investments */}
            <Card className="bg-[#111] border-slate-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Active Investments</CardTitle>
                    <CardDescription className="text-slate-400">Your current earning sources</CardDescription>
                </CardHeader>
                <CardContent>
                    {activeInvestments.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <TrendingUp className="h-7 w-7 text-slate-600" />
                            </div>
                            <p className="text-slate-400 font-medium">No active investments</p>
                            <p className="text-slate-500 text-sm mt-1">Start investing to earn daily income</p>
                            <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" asChild>
                                <Link href="/invest">Browse Plans</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeInvestments.map((investment) => {
                                const dailyAmount = getEffectiveDailyIncomeUsd(investment);
                                return (
                                    <div key={investment.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-orange-500/15 rounded-xl">
                                                <TrendingUp className="h-5 w-5 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{investment.plan_name}</p>
                                                <p className="text-xs text-slate-400">
                                                    ${(investment.amount || 0).toLocaleString('en-US')} invested
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-400 text-lg">+${dailyAmount.toFixed(2)}</p>
                                            <p className="text-xs text-slate-500">per day</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Earnings History */}
            <Card className="bg-[#111] border-slate-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg">Claim History</CardTitle>
                    <CardDescription className="text-slate-400">Your claim records</CardDescription>
                </CardHeader>
                <CardContent>
                    {!earnings || earnings.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400">No claims yet</p>
                            <p className="text-slate-500 text-sm">Claim your first daily payout to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {earnings.slice(0, 30).map((earning) => (
                                <div key={earning.id} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${earning.status === 'credited' ? 'bg-green-500/15' : 'bg-yellow-500/15'}`}>
                                            {earning.status === 'credited' ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-yellow-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Daily claim</p>
                                            <p className="text-xs text-slate-400">{format(new Date(earning.date), 'MMM dd, yyyy')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-green-400">+${earning.amount.toFixed(2)}</p>
                                        <Badge
                                            variant="outline"
                                            className={earning.status === 'credited'
                                                ? 'border-green-500/30 text-green-400 text-xs'
                                                : 'border-yellow-500/30 text-yellow-400 text-xs'}
                                        >
                                            {earning.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

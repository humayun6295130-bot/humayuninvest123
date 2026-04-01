'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Gift, Clock, TrendingUp, Coins, Loader2, CheckCircle } from 'lucide-react';
import { useFirebase, useRealtimeCollection, insertRow } from '@/firebase';
import { db } from '@/firebase/config';
import { doc, increment, writeBatch } from 'firebase/firestore';
import { getEffectiveDailyIncomeUsd } from '@/lib/deposit-income-tiers';

interface ActiveInvestment {
    id: string;
    plan_name: string;
    amount: number;
    daily_roi: number;
    daily_roi_percent?: number;
    status: 'active' | 'completed' | 'cancelled';
    last_claim_date?: string;
}

export default function ClaimDailyDialog({ userProfile }: { userProfile: any }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState('');
    const { toast } = useToast();
    const { isConfigured } = useFirebase();

    const userId = userProfile?.id || userProfile?.uid;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active investments in realtime
    const investmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: userId ? [
            { column: 'user_id', operator: '==' as const, value: userId },
            { column: 'status', operator: '==' as const, value: 'active' },
        ] : [],
        enabled: !!userId,
    }), [userId]);

    const { data: investments } = useRealtimeCollection<ActiveInvestment>(investmentsOptions);

    // Check if user already claimed today (stored in profile as last_daily_claim)
    const lastClaimDate = userProfile?.last_daily_claim
        ? userProfile.last_daily_claim.split('T')[0]
        : null;
    const alreadyClaimedToday = lastClaimDate === today;

    // Calculate total claimable amount from all active investments
    const totalClaimable = useMemo(() => {
        if (!investments || investments.length === 0) return 0;
        return investments.reduce((sum, inv) => {
            if (inv.status === 'active') {
                return sum + getEffectiveDailyIncomeUsd(inv);
            }
            return sum;
        }, 0);
    }, [investments]);

    // Countdown to next claim (midnight)
    useEffect(() => {
        if (!alreadyClaimedToday) {
            setCountdown('');
            return;
        }
        const tick = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();
            if (diff <= 0) {
                setCountdown('00:00:00');
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            );
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [alreadyClaimedToday]);

    const handleClaim = async () => {
        if (!userId || !isConfigured || !db) return;
        if (alreadyClaimedToday) {
            toast({ variant: 'destructive', title: 'Already Claimed', description: 'You have already claimed today. Come back tomorrow!' });
            return;
        }
        if (totalClaimable <= 0) {
            toast({ variant: 'destructive', title: 'Nothing to Claim', description: 'You have no active investments to claim from.' });
            return;
        }

        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const timestampNow = new Date().toISOString();

            // 1. Update user's balance and last_daily_claim date
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, {
                balance: increment(totalClaimable),
                last_daily_claim: timestampNow,
                updated_at: timestampNow,
            });

            // 2. Update each active investment's last_claim_date
            if (investments) {
                for (const inv of investments) {
                    if (inv.status === 'active') {
                        const invRef = doc(db, 'user_investments', inv.id);
                        batch.update(invRef, {
                            last_claim_date: today,
                            days_claimed: (inv as any).days_claimed ? (inv as any).days_claimed + 1 : 1,
                        });
                    }
                }
            }

            await batch.commit();

            // 3. Record transaction
            await insertRow('transactions', {
                user_id: userId,
                user_email: userProfile?.email,
                type: 'daily_claim',
                amount: totalClaimable,
                currency: 'USD',
                status: 'completed',
                description: `Daily profit claim — ${investments?.length || 0} active investment(s)`,
                created_at: timestampNow,
            });

            toast({
                title: '🎉 Daily Profit Claimed!',
                description: `$${totalClaimable.toFixed(2)} has been added to your wallet balance.`,
            });
            setOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Claim Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const hasActiveInvestments = investments && investments.length > 0;
    const canClaim = hasActiveInvestments && !alreadyClaimedToday && totalClaimable > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={canClaim ? 'default' : 'outline'}
                    className={`gap-2 ${canClaim ? 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse' : ''}`}
                >
                    <Gift className="h-4 w-4" />
                    Daily Claim
                    {canClaim && <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">Ready!</span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Coins className="h-5 w-5 text-orange-500" />
                        Daily Profit Claim
                    </DialogTitle>
                    <DialogDescription>
                        One claim per day; amount follows your deposit tier (principal × tier %).
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Claimable Amount */}
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Today's Claimable Amount</p>
                        <p className="text-4xl font-bold text-orange-500">
                            ${totalClaimable.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            From {investments?.length || 0} active investment(s)
                        </p>
                    </div>

                    {/* Investment Breakdown */}
                    {investments && investments.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">Breakdown</p>
                            {investments.map((inv) => {
                                const dailyAmt = getEffectiveDailyIncomeUsd(inv);
                                return (
                                    <div key={inv.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                                        <span className="text-muted-foreground">{inv.plan_name}</span>
                                        <span className="font-semibold text-green-500">+${dailyAmt.toFixed(2)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Status Messages */}
                    {!hasActiveInvestments && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                            <TrendingUp className="h-4 w-4" />
                            <span>No active investments. Invest first to earn daily profits.</span>
                        </div>
                    )}

                    {alreadyClaimedToday && (
                        <div className="flex flex-col items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <p className="text-sm font-medium text-green-500">Already claimed today!</p>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <p className="text-sm">Next claim in: <span className="font-mono font-bold text-foreground">{countdown}</span></p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleClaim}
                        disabled={isLoading || !canClaim}
                        className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    >
                        {isLoading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Claiming...</>
                        ) : alreadyClaimedToday ? (
                            <><CheckCircle className="h-4 w-4" /> Claimed Today</>
                        ) : (
                            <><Gift className="h-4 w-4" /> Claim ${totalClaimable.toFixed(2)}</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrPaymentDialog } from "@/components/invest/qr-payment-dialog";
import { InvestmentProgress } from "@/components/invest/InvestmentProgress";
import { ActiveMiningDialog } from "@/components/mining/active-mining-dialog";
import {
    TrendingUp,
    Wallet,
    Clock,
    CheckCircle,
    Calculator,
    PiggyBank,
    History,
    ArrowRight,
    Gift,
    AlertCircle,
    Zap,
    Calendar,
    DollarSign,
    Percent,
    TrendingDown,
    QrCode,
    Pickaxe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
}

interface UserInvestment {
    id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    daily_roi: number;
    daily_roi_percent?: number;
    total_return: number;
    total_profit?: number;
    earned_so_far: number;
    claimed_so_far: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'cancelled';
    auto_compound: boolean;
    capital_return?: boolean;
    duration_days?: number;
    last_claim_date?: string;
    days_claimed: number;
    completed_at?: string;
    final_payout?: number;
}

interface EarningRecord {
    id: string;
    investment_id: string;
    user_id: string;
    plan_name?: string;
    amount: number;
    date: string;
    claimed_at: string;
}

export default function InvestPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
    const [investAmount, setInvestAmount] = useState("");
    const [isInvesting, setIsInvesting] = useState(false);
    const [calculatorAmount, setCalculatorAmount] = useState("1000");
    const [selectedInvestment, setSelectedInvestment] = useState<UserInvestment | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [showQrPayment, setShowQrPayment] = useState(false);
    const [planForPayment, setPlanForPayment] = useState<InvestmentPlan | null>(null);
    const [showMiningDialog, setShowMiningDialog] = useState(false);
    const [selectedInvestmentForMining, setSelectedInvestmentForMining] = useState<UserInvestment | null>(null);

    // Fetch investment plans
    const plansOptions = useMemo(() => ({
        table: 'investment_plans',
        filters: [{ column: 'is_active', operator: '==' as const, value: true }],
        enabled: true,
    }), []);

    // Fetch user investments
    const userInvestmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    // Fetch earnings history
    const earningsOptions = useMemo(() => ({
        table: 'investment_earnings',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'claimed_at', direction: 'desc' as const },
        limitCount: 50,
        enabled: !!user,
    }), [user]);

    const { data: plans, isLoading: plansLoading } = useRealtimeCollection<InvestmentPlan>(plansOptions);
    const { data: userInvestments, isLoading: investmentsLoading } = useRealtimeCollection<UserInvestment>(userInvestmentsOptions);
    const { data: earningsHistory } = useRealtimeCollection<EarningRecord>(earningsOptions);

    // Calculate statistics
    const activeInvestments = useMemo(() =>
        userInvestments?.filter(inv => inv.status === 'active') || [],
        [userInvestments]
    );

    const completedInvestments = useMemo(() =>
        userInvestments?.filter(inv => inv.status === 'completed') || [],
        [userInvestments]
    );

    const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalEarned = activeInvestments.reduce((sum, inv) => sum + (inv.claimed_so_far || 0), 0);
    const totalPending = activeInvestments.reduce((sum, inv) => sum + (inv.earned_so_far - (inv.claimed_so_far || 0)), 0);
    const dailyEarning = activeInvestments.reduce((sum, inv) => sum + inv.daily_roi, 0);

    // Handle new investment
    const handleInvest = async () => {
        if (!user || !selectedPlan || !investAmount) return;

        const amount = parseFloat(investAmount);
        if (amount < selectedPlan.min_amount || amount > selectedPlan.max_amount) {
            toast({
                variant: "destructive",
                title: "Invalid Amount",
                description: `Investment amount must be between $${selectedPlan.min_amount} and $${selectedPlan.max_amount}`,
            });
            return;
        }

        if ((userProfile?.balance || 0) < amount) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: "Please deposit funds to your wallet first.",
            });
            return;
        }

        setIsInvesting(true);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

            const dailyRoi = (amount * selectedPlan.daily_roi_percent) / 100;
            const totalProfit = dailyRoi * selectedPlan.duration_days;
            const totalReturn = totalProfit + (selectedPlan.capital_return ? amount : 0);

            // Create investment record
            await insertRow('user_investments', {
                user_id: user.uid,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: amount,
                daily_roi: dailyRoi,
                daily_roi_percent: selectedPlan.daily_roi_percent,
                total_return: totalReturn,
                total_profit: totalProfit,
                earned_so_far: 0,
                claimed_so_far: 0,
                days_claimed: 0,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                auto_compound: false,
                capital_return: selectedPlan.capital_return,
            });

            // Deduct from user balance
            await updateRow('users', user.uid, {
                balance: (userProfile?.balance || 0) - amount,
                total_invested: (userProfile?.total_invested || 0) + amount,
            });

            // Record transaction
            await insertRow('transactions', {
                user_id: user.uid,
                type: 'investment',
                amount: -amount,
                status: 'completed',
                description: `Investment in ${selectedPlan.name}`,
                reference_id: selectedPlan.id,
            });

            toast({
                title: "Investment Successful! 🎉",
                description: `You invested $${amount} in ${selectedPlan.name}. Daily ROI: $${dailyRoi.toFixed(2)}`,
            });

            setSelectedPlan(null);
            setInvestAmount("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Investment Failed",
                description: error.message,
            });
        } finally {
            setIsInvesting(false);
        }
    };

    // Handle claim earnings
    const handleClaimEarnings = async () => {
        if (!user || !selectedInvestment) return;

        setIsClaiming(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Check if already claimed today for this investment
            if (selectedInvestment.last_claim_date === today) {
                toast({
                    variant: "destructive",
                    title: "Already Claimed",
                    description: "You have already claimed today's earnings for this investment.",
                });
                setIsClaiming(false);
                return;
            }

            const claimAmount = selectedInvestment.daily_roi;
            const newClaimedAmount = (selectedInvestment.claimed_so_far || 0) + claimAmount;
            const newDaysClaimed = (selectedInvestment.days_claimed || 0) + 1;

            // Calculate total earned so far
            const newEarnedSoFar = selectedInvestment.daily_roi * newDaysClaimed;

            // Update investment record
            await updateRow('user_investments', selectedInvestment.id, {
                claimed_so_far: newClaimedAmount,
                earned_so_far: newEarnedSoFar,
                days_claimed: newDaysClaimed,
                last_claim_date: today,
            });

            // Add to user balance
            await updateRow('users', user.uid, {
                balance: (userProfile?.balance || 0) + claimAmount,
                total_earned: (userProfile?.total_earned || 0) + claimAmount,
            });

            // Record earning
            await insertRow('investment_earnings', {
                user_id: user.uid,
                investment_id: selectedInvestment.id,
                plan_name: selectedInvestment.plan_name,
                amount: claimAmount,
                date: today,
                claimed_at: new Date().toISOString(),
            });

            // Record transaction
            await insertRow('transactions', {
                user_id: user.uid,
                type: 'earning_claim',
                amount: claimAmount,
                status: 'completed',
                description: `Earnings from ${selectedInvestment.plan_name}`,
                reference_id: selectedInvestment.id,
            });

            toast({
                title: "Earnings Claimed! 💰",
                description: `$${claimAmount.toFixed(2)} has been added to your balance.`,
            });

            setSelectedInvestment(null);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Claim Failed",
                description: error.message,
            });
        } finally {
            setIsClaiming(false);
        }
    };

    // Handle complete investment (maturity)
    const handleCompleteInvestment = async (investment: UserInvestment) => {
        if (!user) return;

        try {
            const today = new Date();
            const endDate = new Date(investment.end_date);

            if (today < endDate) {
                toast({
                    variant: "destructive",
                    title: "Not Yet Mature",
                    description: "This investment has not reached its maturity date yet.",
                });
                return;
            }

            // Calculate final payout
            const totalProfit = investment.total_profit || (investment.daily_roi * (investment.duration_days || 30));
            const remainingEarnings = totalProfit - (investment.claimed_so_far || 0);
            const capitalReturn = investment.capital_return ? investment.amount : 0;
            const finalPayout = remainingEarnings + capitalReturn;

            // Update investment status
            await updateRow('user_investments', investment.id, {
                status: 'completed',
                completed_at: today.toISOString(),
                final_payout: finalPayout,
                earned_so_far: totalProfit,
                claimed_so_far: totalProfit,
            });

            // Add final payout to balance
            if (finalPayout > 0) {
                await updateRow('users', user.uid, {
                    balance: (userProfile?.balance || 0) + finalPayout,
                    total_earned: (userProfile?.total_earned || 0) + remainingEarnings,
                });

                // Record transaction
                await insertRow('transactions', {
                    user_id: user.uid,
                    type: 'investment_maturity',
                    amount: finalPayout,
                    status: 'completed',
                    description: `Maturity payout from ${investment.plan_name}`,
                    reference_id: investment.id,
                });
            }

            toast({
                title: "Investment Completed! 🎉",
                description: `Your ${investment.plan_name} has matured. $${finalPayout.toFixed(2)} added to your balance.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        }
    };

    // Calculate returns
    const calculateReturns = (plan: InvestmentPlan, amount: number) => {
        const dailyRoi = (amount * plan.daily_roi_percent) / 100;
        const totalProfit = dailyRoi * plan.duration_days;
        const totalReturn = totalProfit + (plan.capital_return ? amount : 0);
        return { dailyRoi, totalProfit, totalReturn };
    };

    // Get days remaining for investment
    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    // Get progress percentage
    const getProgressPercent = (investment: UserInvestment) => {
        const total = investment.duration_days || 30;
        const claimed = investment.days_claimed || 0;
        return Math.min(100, Math.round((claimed / total) * 100));
    };

    // Check if can claim today
    const canClaimToday = (investment: UserInvestment) => {
        const today = new Date().toISOString().split('T')[0];
        return investment.last_claim_date !== today && investment.status === 'active';
    };

    if (plansLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 animate-pulse text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading investment plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Investment Center</h1>
                    <p className="text-muted-foreground">Grow your wealth with our investment plans</p>
                </div>
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Available Balance</p>
                                <p className="text-lg font-bold">${userProfile?.balance?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <PiggyBank className="h-4 w-4 text-primary" />
                            Active Investments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeInvestments.length}</div>
                        <p className="text-xs text-muted-foreground">{completedInvestments.length} completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            Total Invested
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalInvested.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Current capital</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Total Earned
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+${totalEarned.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">${totalPending.toFixed(2)} pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Daily Income
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">+${dailyEarning.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Per day from all plans</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="plans" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                    <TabsTrigger value="plans">Plans</TabsTrigger>
                    <TabsTrigger value="active">My Investments</TabsTrigger>
                    <TabsTrigger value="earnings">Earnings</TabsTrigger>
                    <TabsTrigger value="calculator">Calculator</TabsTrigger>
                </TabsList>

                {/* Investment Plans Tab */}
                <TabsContent value="plans" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {plans?.map((plan) => {
                            const amount = plan.fixed_amount || plan.min_amount;
                            const isEndOfTerm = plan.payout_schedule === 'end_of_term';
                            const { dailyRoi, totalProfit, totalReturn } = calculateReturns(plan, amount);
                            const displayReturn = isEndOfTerm ? (plan.total_return || amount * 2) : totalReturn;

                            return (
                                <Card key={plan.id} className={cn(
                                    "flex flex-col hover:shadow-lg transition-shadow",
                                    isEndOfTerm && "border-green-500/30"
                                )}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                                            <Badge className={cn(
                                                isEndOfTerm ? "bg-green-500/20 text-green-600" : "bg-primary/10 text-primary"
                                            )}>
                                                {isEndOfTerm ? '2X Return' : `${plan.daily_roi_percent}% Daily`}
                                            </Badge>
                                        </div>
                                        <CardDescription>{plan.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {plan.fixed_amount ? (
                                                <div className="col-span-2 bg-primary/5 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-muted-foreground">Fixed Investment</p>
                                                    <p className="font-bold text-xl text-primary">${plan.fixed_amount}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-muted/50 p-3 rounded-lg">
                                                        <p className="text-xs text-muted-foreground">Min Investment</p>
                                                        <p className="font-semibold">${plan.min_amount}</p>
                                                    </div>
                                                    <div className="bg-muted/50 p-3 rounded-lg">
                                                        <p className="text-xs text-muted-foreground">Max Investment</p>
                                                        <p className="font-semibold">${plan.max_amount.toLocaleString()}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {plan.features && plan.features.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">Features</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {plan.features.map((feature, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            {feature}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                setPlanForPayment(plan);
                                                setShowQrPayment(true);
                                            }}
                                        >
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Start Invest
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Active Investments Tab */}
                <TabsContent value="active">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PiggyBank className="h-5 w-5" />
                                My Active Investments
                            </CardTitle>
                            <CardDescription>Manage your ongoing investments and claim earnings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {investmentsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : activeInvestments.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <PiggyBank className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-2">No Active Investments</h3>
                                    <p className="text-muted-foreground mb-4">Start growing your wealth by investing in one of our plans</p>
                                    <Button onClick={() => document.querySelector('[value="plans"]')?.dispatchEvent(new Event('click'))}>
                                        Browse Plans
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeInvestments.map((investment) => {
                                        const daysRemaining = getDaysRemaining(investment.end_date);
                                        const progressPercent = getProgressPercent(investment);
                                        const canClaim = canClaimToday(investment);
                                        const unclaimedAmount = investment.earned_so_far - (investment.claimed_so_far || 0);

                                        return (
                                            <Card key={investment.id} className="border-l-4 border-l-primary">
                                                <CardContent className="p-4">
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-lg">{investment.plan_name}</h4>
                                                                <Badge variant={canClaim ? "default" : "secondary"} className="text-xs">
                                                                    {canClaim ? "Claim Ready" : "Active"}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Invested: <span className="font-medium text-foreground">${investment.amount}</span>
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground">Daily ROI</p>
                                                                <p className="font-semibold text-green-600">+${investment.daily_roi.toFixed(2)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground">Earned</p>
                                                                <p className="font-semibold">${(investment.claimed_so_far || 0).toFixed(2)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground">Unclaimed</p>
                                                                <p className={cn("font-semibold", unclaimedAmount > 0 ? "text-yellow-600" : "text-muted-foreground")}>
                                                                    ${unclaimedAmount.toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Investment Progress Tracker */}
                                                    <div className="mt-4">
                                                        <InvestmentProgress
                                                            amount={investment.amount}
                                                            totalReturn={investment.total_return}
                                                            startDate={investment.start_date}
                                                            endDate={investment.end_date}
                                                            status={investment.status}
                                                        />
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                                                                onClick={() => {
                                                                    setSelectedInvestmentForMining(investment);
                                                                    setShowMiningDialog(true);
                                                                }}
                                                            >
                                                                <Pickaxe className="mr-2 h-4 w-4" />
                                                                View Mining
                                                            </Button>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-4 w-4" />
                                                                    Started: {new Date(investment.start_date).toLocaleDateString()}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-4 w-4" />
                                                                    Ends: {new Date(investment.end_date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            disabled={!canClaim}
                                                            onClick={() => setSelectedInvestment(investment)}
                                                        >
                                                            <Gift className="mr-2 h-4 w-4" />
                                                            {canClaim ? "Claim Now" : "Claimed Today"}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Earnings History Tab */}
                <TabsContent value="earnings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Earnings History
                            </CardTitle>
                            <CardDescription>Track all your claimed earnings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!earningsHistory || earningsHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No earnings history yet</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-2">
                                        {earningsHistory.map((earning) => (
                                            <div
                                                key={earning.id}
                                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-green-500/10 p-2 rounded-full">
                                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">${earning.amount.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">{earning.plan_name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(earning.claimed_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-green-600">Claimed</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Calculator Tab */}
                <TabsContent value="calculator">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5" />
                                ROI Calculator
                            </CardTitle>
                            <CardDescription>Calculate your potential returns before investing</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base">Investment Amount ($)</Label>
                                <Input
                                    type="number"
                                    value={calculatorAmount}
                                    onChange={(e) => setCalculatorAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="text-lg"
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {plans?.map((plan) => {
                                    const amount = parseFloat(calculatorAmount) || 0;
                                    const { dailyRoi, totalProfit, totalReturn } = calculateReturns(plan, amount);
                                    const isValidAmount = amount >= plan.min_amount && amount <= plan.max_amount;

                                    return (
                                        <Card key={plan.id} className={cn(!isValidAmount && "opacity-50")}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">{plan.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Daily Return</span>
                                                    <span className="font-semibold text-green-600">${dailyRoi.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Total Profit</span>
                                                    <span className="font-semibold">${totalProfit.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Total Return</span>
                                                    <span className="font-semibold text-primary">${totalReturn.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Net Profit</span>
                                                    <span className="font-semibold text-green-600">+${(totalProfit).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">ROI %</span>
                                                    <span className="font-semibold">
                                                        {amount > 0 ? ((totalProfit / amount) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                                <Separator />
                                                <div className="text-xs text-muted-foreground">
                                                    Duration: {plan.duration_days} days
                                                    {plan.capital_return && " • Capital Returned"}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Investment Dialog */}
            <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Invest in {selectedPlan?.name}</DialogTitle>
                        <DialogDescription>
                            Enter the amount you want to invest
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Investment Amount ($)</Label>
                            <Input
                                type="number"
                                value={investAmount}
                                onChange={(e) => setInvestAmount(e.target.value)}
                                placeholder={`Min: $${selectedPlan?.min_amount} - Max: $${selectedPlan?.max_amount}`}
                            />
                            <p className="text-xs text-muted-foreground">
                                Available Balance: <span className="font-medium">${userProfile?.balance?.toFixed(2) || '0.00'}</span>
                            </p>
                        </div>
                        {investAmount && selectedPlan && (
                            <div className="rounded-lg bg-muted p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Investment Amount</span>
                                    <span className="font-semibold">${parseFloat(investAmount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Daily ROI ({selectedPlan.daily_roi_percent}%)</span>
                                    <span className="font-semibold text-green-600">
                                        +${((parseFloat(investAmount) * selectedPlan.daily_roi_percent) / 100).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span className="font-semibold">{selectedPlan.duration_days} Days</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Capital Return</span>
                                    <span className="font-semibold">{selectedPlan.capital_return ? 'Yes' : 'No'}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Total Expected Return</span>
                                    <span className="font-bold text-primary">
                                        ${calculateReturns(selectedPlan, parseFloat(investAmount) || 0).totalReturn.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedPlan(null)}>Cancel</Button>
                        <Button
                            onClick={handleInvest}
                            disabled={isInvesting || !investAmount || parseFloat(investAmount) <= 0}
                        >
                            {isInvesting ? 'Processing...' : 'Confirm Investment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Claim Earnings Dialog */}
            <Dialog open={!!selectedInvestment} onOpenChange={() => setSelectedInvestment(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-yellow-500" />
                            Claim Daily Earnings
                        </DialogTitle>
                        <DialogDescription>
                            Claim your daily earnings from {selectedInvestment?.plan_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Today's Earnings</p>
                            <p className="text-4xl font-bold text-yellow-600">
                                +${selectedInvestment?.daily_roi.toFixed(2)}
                            </p>
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Investment</span>
                                <span className="font-medium">${selectedInvestment?.amount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Days Claimed</span>
                                <span className="font-medium">{selectedInvestment?.days_claimed || 0} / {selectedInvestment?.duration_days || 30}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Earned</span>
                                <span className="font-medium text-green-600">${(selectedInvestment?.claimed_so_far || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedInvestment(null)}>Cancel</Button>
                        <Button
                            onClick={handleClaimEarnings}
                            disabled={isClaiming}
                            className="bg-yellow-500 hover:bg-yellow-600"
                        >
                            {isClaiming ? 'Processing...' : 'Claim Earnings'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QR Payment Dialog */}
            <QrPaymentDialog
                open={showQrPayment}
                onOpenChange={setShowQrPayment}
                plan={planForPayment}
                userId={user?.uid || ''}
                userEmail={userProfile?.email}
            />

            {/* Active Mining Dialog */}
            <ActiveMiningDialog
                investment={selectedInvestmentForMining}
                open={showMiningDialog}
                onOpenChange={setShowMiningDialog}
            />
        </div>
    );
}

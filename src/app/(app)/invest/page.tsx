"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useRealtimeCollection } from "@/firebase";
import { db } from "@/firebase/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrPaymentDialog } from "@/components/invest/qr-payment-dialog";
import { ReinvestFromBalanceCard } from "@/components/invest/reinvest-from-balance-card";
import { InvestmentProgress } from "@/components/invest/InvestmentProgress";
import { ActiveMiningDialog } from "@/components/mining/active-mining-dialog";
import { PremiumInvestmentCard } from "@/components/invest/premium-investment-card";
import { PremiumHeader, StatsCard } from "@/components/invest/premium-header";
import { ChipNavigation, TabSwitcher, SortDropdown, SortOption } from "@/components/ui/premium-navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getEffectiveDailyIncomeUsd, resolveDailyIncomeForDeposit } from "@/lib/deposit-income-tiers";
import { DAILY_CLAIM_ERR, executeUnifiedDailyClaim, hasClaimedDailyToday } from "@/lib/daily-claim";
import {
    TrendingUp,
    Wallet,
    Clock,
    Gift,
    Calendar,
    DollarSign,
    PiggyBank,
    History,
    Pickaxe,
    QrCode,
    ArrowRight
} from "lucide-react";

// Type definitions
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
    is_active?: boolean;
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
    claimed_so_far?: number;
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

    // UI State
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

    // Navigation State
    // Must match `desktopTabs` labels (TabSwitcher passes exact strings).
    const [activeTab, setActiveTab] = useState("Plans");
    const [activeCategory, setActiveCategory] = useState("All");
    const [sortBy, setSortBy] = useState<SortOption>("yield");

    const desktopTabs = ["Plans", "My Investments", "Earnings", "Calculator"];

    // Sort options
    const sortOptions = [
        { value: 'yield' as SortOption, label: 'Sort by Yield' },
        { value: 'risk' as SortOption, label: 'Sort by Risk' },
        { value: 'newest' as SortOption, label: 'Newest First' },
    ];

    // Data fetching
    /** Load all plans; filter `is_active` on the client so missing/legacy fields still show. */
    const plansOptions = useMemo(() => ({
        table: 'investment_plans',
        filters: [] as { column: string; operator: '=='; value: unknown }[],
        enabled: true,
    }), []);

    /** No orderBy — avoids Firestore composite index requirement when index file is empty */
    const userInvestmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const earningsOptions = useMemo(() => ({
        table: 'investment_earnings',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        limitCount: 50,
        enabled: !!user,
    }), [user]);

    const { data: plans, isLoading: plansLoading, error: plansError } = useRealtimeCollection<InvestmentPlan>(plansOptions);

    const activePlans = useMemo(() => {
        if (!plans?.length) return [];
        const visible = plans.filter((p) => p.is_active !== false);
        if (visible.length > 0) return visible;
        return plans;
    }, [plans]);

    /** Prefer plan.daily_roi_percent; if 0/missing, infer from total return % ÷ duration (e.g. unified seed plan). */
    const planRoiPercent = (p: InvestmentPlan) => {
        const direct = Number(p.daily_roi_percent);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const dur = Number(p.duration_days) || 1;
        const ret = Number(p.return_percent);
        if (Number.isFinite(ret) && ret > 0 && dur > 0) return ret / dur;
        return 0;
    };

    const categoryOptions = useMemo(() => {
        const labels = activePlans
            .map((p) => p.category)
            .filter((c): c is string => typeof c === 'string' && c.trim() !== '');
        const uniq = [...new Set(labels.map((c) => c.trim()))].sort((a, b) => a.localeCompare(b));
        return ['All', ...uniq];
    }, [activePlans]);

    useEffect(() => {
        if (!categoryOptions.includes(activeCategory)) {
            setActiveCategory('All');
        }
    }, [categoryOptions, activeCategory]);
    const { data: userInvestmentsRaw, isLoading: investmentsLoading } = useRealtimeCollection<UserInvestment>(userInvestmentsOptions);
    const { data: earningsHistoryRaw } = useRealtimeCollection<EarningRecord>(earningsOptions);

    const userInvestments = useMemo(() => {
        if (!userInvestmentsRaw?.length) return userInvestmentsRaw;
        return [...userInvestmentsRaw].sort(
            (a, b) =>
                new Date((b as any).created_at || b.start_date || 0).getTime() -
                new Date((a as any).created_at || a.start_date || 0).getTime()
        );
    }, [userInvestmentsRaw]);

    const earningsHistory = useMemo(() => {
        if (!earningsHistoryRaw?.length) return earningsHistoryRaw;
        return [...earningsHistoryRaw].sort(
            (a, b) => new Date(b.claimed_at || b.date || 0).getTime() - new Date(a.claimed_at || a.date || 0).getTime()
        );
    }, [earningsHistoryRaw]);

    // Computed values
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
    const dailyEarning = activeInvestments.reduce((sum, inv) => sum + getEffectiveDailyIncomeUsd(inv), 0);

    // Filter and sort plans
    const filteredPlans = useMemo(() => {
        let filtered =
            activeCategory === 'All'
                ? activePlans
                : activePlans.filter(
                      (p) => (p.category || '').toLowerCase() === activeCategory.toLowerCase()
                  );

        return [...filtered].sort((a, b) => {
            const pa = planRoiPercent(a);
            const pb = planRoiPercent(b);
            switch (sortBy) {
                case 'yield':
                    return pb - pa;
                case 'risk':
                    return pa - pb;
                case 'duration':
                    return a.duration_days - b.duration_days;
                case 'newest':
                    return 0;
                default:
                    return 0;
            }
        });
    }, [activePlans, activeCategory, sortBy]);

    // Handlers
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
        const tierCk = resolveDailyIncomeForDeposit(amount);
        if (tierCk.tierLevel <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid amount",
                description: "Use at least $30 within an allowed deposit tier (see plan range).",
            });
            return;
        }

        setPlanForPayment(selectedPlan);
        setShowQrPayment(true);
        setSelectedPlan(null);
    };

    const handleClaimEarnings = async () => {
        if (!user || !userProfile || !db) return;

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
                investments: (userInvestments || []) as any[],
            });

            toast({
                title: "Earnings Claimed! 💰",
                description: `$${totalClaimed.toFixed(2)} from ${activeCount} active plan(s) added to your balance (one claim per day for your account).`,
            });

            setSelectedInvestment(null);
        } catch (error: any) {
            const msg = error?.message;
            if (msg === DAILY_CLAIM_ERR.ALREADY_TODAY) {
                toast({
                    variant: "destructive",
                    title: "Already Claimed",
                    description: "You have already claimed today. Wallet and Earnings use the same daily claim.",
                });
            } else if (msg === DAILY_CLAIM_ERR.NOTHING) {
                toast({
                    variant: "destructive",
                    title: "Nothing to Claim",
                    description: "No active plans with claimable daily income.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Claim Failed",
                    description: msg || "Something went wrong.",
                });
            }
        } finally {
            setIsClaiming(false);
        }
    };

    // Helper functions
    const calculateReturns = (plan: InvestmentPlan, amount: number) => {
        const tiered = resolveDailyIncomeForDeposit(amount);
        const dailyRoi = tiered.dailyUsd;
        const totalProfit = dailyRoi * plan.duration_days;
        const totalReturn = totalProfit + (plan.capital_return ? amount : 0);
        return { dailyRoi, totalProfit, totalReturn, tierPercent: tiered.incomePercent, tierLevel: tiered.tierLevel };
    };

    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const getProgressPercent = (investment: UserInvestment) => {
        const total = investment.duration_days || 30;
        const claimed = investment.days_claimed || 0;
        return Math.min(100, Math.round((claimed / total) * 100));
    };

    const canClaimToday = (investment: UserInvestment) => {
        if (investment.status !== "active") return false;
        if (hasClaimedDailyToday(userProfile?.last_daily_claim)) return false;
        return getEffectiveDailyIncomeUsd(investment) > 0;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (plansLoading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading investment plans...</p>
                </div>
            </div>
        );
    }

    if (plansError) {
        const detail =
            plansError instanceof Error ? plansError.message : String((plansError as { message?: string })?.message ?? plansError);
        return (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center space-y-3">
                <p className="font-semibold text-foreground">Could not load investment plans</p>
                <p className="text-sm text-muted-foreground">
                    If this persists, check Firestore rules for signed-in reads on{' '}
                    <code className="text-xs">investment_plans</code> and your network. Details:
                </p>
                <p className="text-xs font-mono text-destructive/90 break-words max-w-lg mx-auto">{detail}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Premium Header */}
            <PremiumHeader
                balance={userProfile?.balance || 0}
                userName={userProfile?.full_name}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    label="Active Investments"
                    value={activeInvestments.length}
                    subValue={`${completedInvestments.length} completed`}
                    icon={<PiggyBank className="w-4 h-4 text-indigo-600" />}
                />
                <StatsCard
                    label="Total Invested"
                    value={formatCurrency(totalInvested)}
                    subValue="Current capital"
                    icon={<DollarSign className="w-4 h-4 text-foreground" />}
                    variant="default"
                />
                <StatsCard
                    label="Total Earned"
                    value={formatCurrency(totalEarned)}
                    subValue={`${formatCurrency(totalPending)} pending`}
                    icon={<TrendingUp className="w-4 h-4 text-green-400" />}
                    variant="success"
                />
                <StatsCard
                    label="Daily Income"
                    value={formatCurrency(dailyEarning)}
                    subValue="Per day from all plans"
                    icon={<Gift className="w-4 h-4 text-yellow-600" />}
                    variant="warning"
                />
            </div>

            {user && userProfile && (
                <ReinvestFromBalanceCard
                    userId={user.uid}
                    userEmail={userProfile.email || user.email || ""}
                    balance={Number(userProfile.balance) || 0}
                    plans={activePlans}
                    reinvestCount={Number(userProfile.reinvest_count) || 0}
                    reinvestTotal={Number(userProfile.reinvest_total_usd) || 0}
                    withdrawalRequestCount={Number(userProfile.withdrawal_request_count) || 0}
                    withdrawalRequestTotal={Number(userProfile.withdrawal_request_total_usd) || 0}
                />
            )}

            {/* Navigation - Mobile Chips / Desktop Tabs */}
            <div className="space-y-4">
                {/* Mobile: main tabs (Plans / My Investments / …) — was desktop-only, so mobile users could not switch */}
                <div className="lg:hidden overflow-x-auto pb-1 -mx-1 px-1">
                    <TabSwitcher
                        items={desktopTabs}
                        activeItem={activeTab}
                        onSelect={setActiveTab}
                    />
                </div>

                {/* Mobile: category chips (only makes sense on Plans) */}
                {activeTab === 'Plans' && (
                    <div className="lg:hidden">
                        <ChipNavigation
                            items={categoryOptions}
                            activeItem={activeCategory}
                            onSelect={setActiveCategory}
                        />
                    </div>
                )}

                {/* Desktop Tab Switcher */}
                <div className="hidden lg:flex items-center justify-between">
                    <TabSwitcher
                        items={desktopTabs}
                        activeItem={activeTab}
                        onSelect={setActiveTab}
                    />

                    {activeTab === "Plans" && (
                        <SortDropdown
                            options={sortOptions}
                            activeOption={sortBy}
                            onSelect={setSortBy}
                        />
                    )}
                </div>

                {activeTab === "Plans" && (
                    <div className="hidden lg:block">
                        <ChipNavigation
                            items={categoryOptions}
                            activeItem={activeCategory}
                            onSelect={setActiveCategory}
                        />
                    </div>
                )}
            </div>

            {/* Content Sections */}
            <div className="space-y-6">
                {/* Plans Tab */}
                {activeTab === "Plans" && (
                    <div className="space-y-6">
                        {/* Mobile sort dropdown */}
                        <div className="lg:hidden flex justify-end">
                            <SortDropdown
                                options={sortOptions}
                                activeOption={sortBy}
                                onSelect={setSortBy}
                            />
                        </div>

                        {/* Investment Cards Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredPlans.map((plan, index) => (
                                <PremiumInvestmentCard
                                    key={plan.id}
                                    plan={{ ...plan, is_verified: true }}
                                    onSelect={(p) => {
                                        setSelectedPlan(p);
                                        setInvestAmount(p.fixed_amount ? p.fixed_amount.toString() : '');
                                    }}
                                    index={index}
                                />
                            ))}
                        </div>

                        {filteredPlans.length === 0 && (
                            <div className="text-center py-12 space-y-3">
                                <p className="text-muted-foreground">
                                    {activePlans.length === 0
                                        ? 'No active investment plans in the database. An admin should add plans under Admin → Plan manager (or run setup scripts).'
                                        : 'No plans in this category — tap “All” or another category above.'}
                                </p>
                                {activePlans.length > 0 && activeCategory !== 'All' && (
                                    <Button variant="outline" size="sm" onClick={() => setActiveCategory('All')}>
                                        Show all categories
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Active Investments Tab */}
                {activeTab === "My Investments" && (
                    <div className="space-y-4">
                        {investmentsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                            </div>
                        ) : activeInvestments.length === 0 ? (
                            <div className="premium-card text-center py-16">
                                <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
                                    <PiggyBank className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-headline text-lg font-bold text-foreground mb-2">No Active Investments</h3>
                                <p className="text-muted-foreground mb-6">Start growing your wealth by investing in one of our plans</p>
                                <Button className="btn-primary" onClick={() => setActiveTab("Plans")}>
                                    Browse Plans
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            activeInvestments.map((investment) => {
                                const daysRemaining = getDaysRemaining(investment.end_date);
                                const progressPercent = getProgressPercent(investment);
                                const canClaim = canClaimToday(investment);
                                const unclaimedAmount = investment.earned_so_far - (investment.claimed_so_far || 0);
                                const dailyPay = getEffectiveDailyIncomeUsd(investment);

                                return (
                                    <div
                                        key={investment.id}
                                        className="premium-card border-l-4 border-l-indigo-500"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-headline text-lg font-bold text-foreground">{investment.plan_name}</h4>
                                                    <span className={cn(
                                                        "category-pill",
                                                        canClaim ? "bg-orange-500/20 text-orange-400" : "bg-[#1a1a1a] text-gray-400"
                                                    )}>
                                                        {canClaim ? "Claim Ready" : "Active"}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Invested: <span className="font-semibold text-foreground">${investment.amount}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Per day</p>
                                                    <p className="font-semibold text-green-400">+${dailyPay.toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Earned</p>
                                                    <p className="font-semibold text-foreground">${(investment.claimed_so_far || 0).toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Unclaimed</p>
                                                    <p className={cn("font-semibold", unclaimedAmount > 0 ? "text-yellow-600" : "text-muted-foreground")}>
                                                        ${unclaimedAmount.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <InvestmentProgress
                                            amount={investment.amount}
                                            totalReturn={investment.total_return}
                                            startDate={investment.start_date}
                                            endDate={investment.end_date}
                                            status={investment.status}
                                        />

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="btn-secondary"
                                                    onClick={() => {
                                                        setSelectedInvestmentForMining(investment);
                                                        setShowMiningDialog(true);
                                                    }}
                                                >
                                                    <Pickaxe className="mr-2 w-4 h-4" />
                                                    View Mining
                                                </Button>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        Started: {new Date(investment.start_date).toLocaleDateString('en-US')}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="btn-primary"
                                                disabled={!canClaim}
                                                onClick={() => setSelectedInvestment(investment)}
                                            >
                                                <Gift className="mr-2 w-4 h-4" />
                                                {canClaim ? "Claim Now" : "Claimed Today"}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Earnings Tab */}
                {activeTab === "Earnings" && (
                    <div className="premium-card">
                        <div className="mb-6">
                            <h2 className="font-headline text-xl font-bold text-foreground">Earnings History</h2>
                            <p className="text-muted-foreground text-sm">Track all your claimed earnings</p>
                        </div>

                        {!earningsHistory || earningsHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No earnings history yet</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {earningsHistory.map((earning) => (
                                        <div
                                            key={earning.id}
                                            className="flex items-center justify-between p-4 rounded-lg border border-border-subtle hover:bg-[#1a1a1a] transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground">${earning.amount.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">{earning.plan_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(earning.claimed_at).toLocaleDateString('en-US')}
                                                </p>
                                                <p className="text-xs text-green-400 font-medium">Claimed</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                )}

                {/* Calculator Tab */}
                {activeTab === "Calculator" && (
                    <div className="premium-card">
                        <div className="mb-6">
                            <h2 className="font-headline text-xl font-bold text-foreground">ROI Calculator</h2>
                            <p className="text-muted-foreground text-sm">Calculate your potential returns before investing</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base font-medium">Investment Amount ($)</Label>
                                <Input
                                    type="number"
                                    value={calculatorAmount}
                                    onChange={(e) => setCalculatorAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="text-lg border-border-subtle focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {plans?.map((plan) => {
                                    const amount = parseFloat(calculatorAmount) || 0;
                                    const { dailyRoi, totalProfit, totalReturn } = calculateReturns(plan, amount);
                                    const isValidAmount = amount >= plan.min_amount && amount <= plan.max_amount;

                                    return (
                                        <div
                                            key={plan.id}
                                            className={cn(
                                                "premium-card p-4",
                                                !isValidAmount && "opacity-50"
                                            )}
                                        >
                                            <h4 className="font-headline font-bold text-foreground mb-4">{plan.name}</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Daily Return</span>
                                                    <span className="font-semibold text-green-400">${dailyRoi.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Total Profit</span>
                                                    <span className="font-semibold text-foreground">${totalProfit.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Total Return</span>
                                                    <span className="font-semibold text-indigo-600">${totalReturn.toFixed(2)}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">ROI %</span>
                                                    <span className="font-semibold text-foreground">
                                                        {amount > 0 ? ((totalProfit / amount) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Investment Dialog */}
            <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-[12px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Invest in {selectedPlan?.name}</DialogTitle>
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
                                className="border-border-subtle focus:border-indigo-500"
                            />
                            <p className="text-xs text-muted-foreground">
                                Available Balance: <span className="font-medium text-foreground">${userProfile?.balance?.toFixed(2) || '0.00'}</span>
                            </p>
                        </div>
                        {investAmount && selectedPlan && (() => {
                            const amt = parseFloat(investAmount);
                            const t = resolveDailyIncomeForDeposit(Number.isFinite(amt) ? amt : 0);
                            return (
                            <div className="rounded-lg border border-border-subtle p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Investment Amount</span>
                                    <span className="font-semibold text-foreground">${Number.isFinite(amt) ? amt.toFixed(2) : "0.00"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t.tierLevel > 0 ? `Tier ${t.tierLevel} (${t.incomePercent}%/day)` : "Amount out of tier range"}
                                    </span>
                                    <span className="font-semibold text-green-400">
                                        +${t.dailyUsd.toFixed(2)}
                                    </span>
                                </div>
                                <Separator />
                            </div>
                            );
                        })()}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="btn-text" onClick={() => setSelectedPlan(null)}>Cancel</Button>
                        <Button
                            className="btn-primary"
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
                <DialogContent className="sm:max-w-[425px] rounded-[12px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline flex items-center gap-2">
                            <Gift className="w-5 h-5 text-yellow-500" />
                            Claim Daily Earnings
                        </DialogTitle>
                        <DialogDescription>
                            One claim per day credits every active plan (same as Wallet / Earnings). From:{" "}
                            {selectedInvestment?.plan_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="border border-border-subtle rounded-xl p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Today&apos;s total (all active plans)</p>
                            <p className="font-headline text-4xl font-bold text-foreground">
                                +${dailyEarning.toFixed(2)}
                            </p>
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Investment</span>
                                <span className="font-medium text-foreground">${selectedInvestment?.amount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Days Claimed</span>
                                <span className="font-medium text-foreground">{selectedInvestment?.days_claimed || 0} days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Earned</span>
                                <span className="font-medium text-green-400">${(selectedInvestment?.claimed_so_far || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="btn-text" onClick={() => setSelectedInvestment(null)}>Cancel</Button>
                        <Button
                            className="btn-primary"
                            onClick={handleClaimEarnings}
                            disabled={
                                isClaiming ||
                                hasClaimedDailyToday(userProfile?.last_daily_claim) ||
                                dailyEarning <= 0
                            }
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
                userEmail={userProfile?.email || user?.email || ""}
                customAmount={investAmount ? parseFloat(investAmount) : undefined}
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

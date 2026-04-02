"use client";
import { useUser, useRealtimeCollection } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, DollarSign, Wallet, ArrowRight, Users, Zap, BarChart3, Activity, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { getLiveInvestmentLevels, getUserLevel } from "@/lib/level-config";
import { DEFAULT_REFERRAL_SETTINGS } from "@/lib/referral-system";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function UserDashboard({ userProfile }: { userProfile: any }) {
    const { user } = useUser();

    const totalInvested = userProfile?.total_invested || 0;
    const totalEarnings = userProfile?.total_earnings || 0;
    const activeInvestments = userProfile?.active_investments_count || 0;
    const balance = userProfile?.balance || 0;
    const referralBalance = userProfile?.referral_balance || 0;
    const userLevel = getUserLevel(totalInvested);

    const transactionsOptions = useMemo(() => ({
        table: 'transactions',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        limitCount: 30,
        enabled: !!user,
    }), [user]);

    const { data: transactions } = useRealtimeCollection(transactionsOptions);

    const chartData = useMemo(() => {
        const days: Record<string, number> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { weekday: 'short' });
            days[key] = 0;
        }
        (transactions || []).forEach((tx: any) => {
            if (['daily_claim', 'daily_profit', 'earning_claim', 'referral_bonus'].includes(tx.type)) {
                const date = new Date(tx.created_at?.seconds ? tx.created_at.seconds * 1000 : tx.created_at);
                const key = date.toLocaleDateString('en-US', { weekday: 'short' });
                if (key in days) days[key] += Number(tx.amount) || 0;
            }
        });
        return Object.entries(days).map(([day, earnings]) => ({ day, earnings: parseFloat(earnings.toFixed(2)) }));
    }, [transactions]);

    const liveLevels = getLiveInvestmentLevels();
    const nextLevel = liveLevels.find(l => l.level === userLevel.level + 1);
    const progressToNext = nextLevel
        ? Math.min(100, ((totalInvested - userLevel.minInvestment) / (nextLevel.minInvestment - userLevel.minInvestment)) * 100)
        : 100;

    const stats = [
        {
            label: "Total Invested",
            value: `$${totalInvested.toLocaleString('en-US')}`,
            icon: TrendingUp,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20",
        },
        {
            label: "Total Earnings",
            value: `$${totalEarnings.toLocaleString('en-US')}`,
            icon: DollarSign,
            color: "text-green-500",
            bg: "bg-green-500/10",
            border: "border-green-500/20",
        },
        {
            label: "Main Balance",
            value: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            icon: Wallet,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
        },
        {
            label: "Referral Balance",
            value: `$${referralBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            icon: Gift,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
        },
    ];

    const quickActions = [
        { href: "/wallet", icon: Wallet, label: "Deposit", desc: "Add funds", color: "bg-orange-500/10 text-orange-400" },
        { href: "/invest", icon: TrendingUp, label: "Invest", desc: "Start earning", color: "bg-green-500/10 text-green-400" },
        { href: "/earnings", icon: DollarSign, label: "Claim", desc: "Daily income", color: "bg-blue-500/10 text-blue-400" },
        { href: "/referrals", icon: Users, label: "Refer", desc: `${DEFAULT_REFERRAL_SETTINGS.level1_percent}%·${DEFAULT_REFERRAL_SETTINGS.level2_percent}%·${DEFAULT_REFERRAL_SETTINGS.level3_percent}%`, color: "bg-purple-500/10 text-purple-400" },
    ];

    return (
        <div className="space-y-6 pb-6">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        Welcome back, <span className="text-orange-400">{userProfile?.display_name?.split(' ')[0] || 'Investor'}</span> 👋
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Claim tier-based daily income once every 24 hours
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/wallet">
                        <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                            <Wallet className="h-4 w-4 mr-1.5" />
                            Deposit
                        </Button>
                    </Link>
                    <Link href="/invest">
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
                            <TrendingUp className="h-4 w-4 mr-1.5" />
                            Invest Now
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid - 2x2 on mobile, 4 columns on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat) => (
                    <Card key={stat.label} className={cn("border", stat.border)}>
                        <CardContent className="p-4">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                                <stat.icon className={cn("h-5 w-5", stat.color)} />
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                            <p className={cn("text-lg sm:text-xl font-bold", stat.color)}>{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions - Android-style pill buttons */}
            <div className="grid grid-cols-4 gap-2">
                {quickActions.map((action) => (
                    <Link key={action.href} href={action.href}>
                        <div className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted/50 transition-colors text-center cursor-pointer">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", action.color)}>
                                <action.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold">{action.label}</p>
                                <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Level Progress */}
            <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Level {userLevel.level} — {userLevel.name}</p>
                                <p className="text-xs text-muted-foreground">{userLevel.dailyIncomePercent}% / day (plan level)</p>
                            </div>
                        </div>
                        <Badge className="bg-orange-500/20 text-orange-400 border-0">
                            {activeInvestments} active
                        </Badge>
                    </div>
                    {nextLevel && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>${totalInvested.toLocaleString('en-US')} invested</span>
                                <span>Next: ${nextLevel.minInvestment.toLocaleString('en-US')}</span>
                            </div>
                            <Progress value={progressToNext} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                ${Math.max(0, (nextLevel.minInvestment - totalInvested)).toLocaleString('en-US')} more to Level {nextLevel.level} ({nextLevel.dailyIncomePercent}% / day)
                            </p>
                        </div>
                    )}
                    {!nextLevel && (
                        <div className="flex items-center gap-2 text-xs text-orange-400">
                            <CheckCircle className="h-4 w-4" />
                            <span>You&apos;ve reached the highest plan level.</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Earnings Analytics Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-orange-500" />
                            <CardTitle className="text-base">Weekly Earnings</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
                            Last 7 days
                        </Badge>
                    </div>
                    <CardDescription className="text-xs">Daily claims & referral bonuses</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    {chartData.some(d => d.earnings > 0) ? (
                        <div className="h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: 12 }}
                                        labelStyle={{ color: '#999' }}
                                        itemStyle={{ color: '#f97316' }}
                                        formatter={(v: any) => [`$${v}`, 'Earned']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="earnings"
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        fill="url(#earningsGrad)"
                                        dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[160px] flex flex-col items-center justify-center gap-3">
                            <Activity className="h-10 w-10 text-muted-foreground/30" />
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground">No earnings yet</p>
                                <p className="text-xs text-muted-foreground/60">Invest and claim to see your chart</p>
                            </div>
                            <Link href="/invest">
                                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black text-xs">
                                    Start Investing
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Investment Plans Preview */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">Investment Plans</h2>
                    <Link href="/invest">
                        <Button variant="ghost" size="sm" className="text-orange-400 text-xs gap-1">
                            View All <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {liveLevels.slice(0, 3).map((level) => (
                        <Card key={level.level} className={cn(
                            "border hover:border-orange-500/30 transition-colors",
                            level.level === userLevel.level && "border-orange-500/40 bg-orange-500/5"
                        )}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-bold text-sm">Level {level.level}</p>
                                        <p className="text-xs text-muted-foreground">{level.name}</p>
                                    </div>
                                    <Badge className={cn(
                                        "text-xs font-bold",
                                        level.level >= 4 ? "bg-orange-500/20 text-orange-400 border-0" : "bg-card border border-border"
                                    )}>
                                        {level.dailyIncomePercent}%/day
                                    </Badge>
                                </div>
                                <p className="text-lg font-bold text-orange-400">
                                    ${level.minInvestment} – ${level.maxInvestment.toLocaleString('en-US')}
                                </p>
                                <p className="text-xs text-muted-foreground mb-3">Investment Range</p>
                                <Link href="/invest">
                                    <Button
                                        className="w-full h-8 text-xs"
                                        variant={level.level === userLevel.level ? "default" : "outline"}
                                    >
                                        {level.level === userLevel.level ? "Current Level" : "Invest"}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Recent Transactions */}
            {transactions && transactions.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                            <Link href="/transactions">
                                <Button variant="ghost" size="sm" className="text-orange-400 text-xs gap-1">
                                    All <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {transactions.slice(0, 5).map((tx: any) => {
                                const income = ['deposit', 'daily_claim', 'daily_profit', 'earning_claim', 'referral_bonus'];
                                const isIncome = income.includes(tx.type);
                                return (
                                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                                                isIncome ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                            )}>
                                                {isIncome ? "+" : "−"}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium capitalize">
                                                    {tx.type?.replace(/_/g, ' ') || 'Transaction'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {tx.status === 'pending' ? '⏳ Pending' : tx.status === 'completed' ? '✅ Completed' : tx.status}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={cn("text-sm font-bold", isIncome ? "text-green-400" : "text-red-400")}>
                                            {isIncome ? '+' : '-'}${Number(tx.amount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

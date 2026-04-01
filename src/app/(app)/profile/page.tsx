'use client';

import Link from 'next/link';
import { useUser, useRealtimeCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    User,
    Mail,
    Calendar,
    Shield,
    Wallet,
    TrendingUp,
    Award,
    Hash,
    Clock,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    ExternalLink,
    Star,
    Target,
    Calculator,
    Gift
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { getLiveInvestmentLevels, getLevelInfo, getNextLevel, calculateDailyEarnings, calculateWeeklyEarnings, calculateMonthlyEarnings } from '@/lib/level-config';
import { DEFAULT_REFERRAL_SETTINGS } from '@/lib/referral-system';
import { useToast } from '@/hooks/use-toast';
import { formatSupportId } from '@/lib/support-id';
import { isAdminProfile } from '@/lib/user-role';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function ProfilePage() {
    const { user, userProfile, isUserLoading } = useUser();
    const { toast } = useToast();
    const [copied, setCopied] = useState<string | null>(null);
    const [calculatorAmount, setCalculatorAmount] = useState<string>('100');

    const toNumber = (v: unknown): number => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? n : 0;
    };

    const toDate = (value: unknown): Date | null => {
        if (!value) return null;
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
        if (typeof value === 'string' || typeof value === 'number') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        if (typeof value === 'object' && value !== null && 'seconds' in (value as any)) {
            const sec = Number((value as any).seconds);
            if (!Number.isFinite(sec)) return null;
            const d = new Date(sec * 1000);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        return null;
    };

    const formatDateSafe = (value: unknown, fmt: string): string => {
        const d = toDate(value);
        if (!d) return 'N/A';
        try {
            return format(d, fmt);
        } catch {
            return 'N/A';
        }
    };

    // Fetch user's investments
    const investmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const { data: investments } = useRealtimeCollection(investmentsOptions);

    // Fetch user's transactions
    const transactionsOptions = useMemo(() => ({
        table: 'transactions',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        limitCount: 5,
        enabled: !!user,
    }), [user]);

    const { data: recentTransactions } = useRealtimeCollection(transactionsOptions);

    // Calculate level info (memoized)
    const currentBalance = userProfile?.balance || 0;
    const levelInfo = useMemo(() => getLevelInfo(currentBalance), [currentBalance]);
    const nextLevel = useMemo(() => getNextLevel(levelInfo.level), [levelInfo.level]);

    // Calculate progress to next level (memoized)
    const progressToNext = useMemo(() => {
        if (!nextLevel) return 100;
        return Math.min(100, ((currentBalance - levelInfo.min) / (nextLevel.min - levelInfo.min)) * 100);
    }, [currentBalance, levelInfo, nextLevel]);

    // Calculate daily earnings based on current level (memoized)
    const { daily: currentLevelDailyEarnings, weekly: currentLevelWeeklyEarnings, monthly: currentLevelMonthlyEarnings } = useMemo(() => ({
        daily: calculateDailyEarnings(currentBalance),
        weekly: calculateWeeklyEarnings(currentBalance),
        monthly: calculateMonthlyEarnings(currentBalance)
    }), [currentBalance]);

    // Calculator level info and earnings based on input amount (memoized)
    const calcAmount = parseFloat(calculatorAmount) || 0;
    const calcLevelInfo = useMemo(() => getLevelInfo(calcAmount), [calcAmount]);
    const { daily: calcDailyEarnings, weekly: calcWeeklyEarnings, monthly: calcMonthlyEarnings } = useMemo(() => ({
        daily: calcAmount > 0 ? calculateDailyEarnings(calcAmount) : 0,
        weekly: calcAmount > 0 ? calculateWeeklyEarnings(calcAmount) : 0,
        monthly: calcAmount > 0 ? calculateMonthlyEarnings(calcAmount) : 0
    }), [calcAmount]);

    if (isUserLoading || !userProfile) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>
            </div>
        );
    }

    const copyToClipboard = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
        toast({ title: 'Copied!', description: `${type} copied to clipboard` });
    };

    const totalInvested = investments?.reduce((sum, inv: any) => sum + toNumber(inv.amount), 0) || 0;
    const totalReturns = investments?.reduce((sum, inv: any) => sum + toNumber(inv.total_return ?? inv.expected_return), 0) || 0;
    const activeInvestments = investments?.filter((inv: any) => inv.status === 'active').length || 0;

    // Calculate profile completion
    const profileFields = [
        userProfile.display_name,
        userProfile.email,
        userProfile.username,
        userProfile.bio,
        userProfile.phone,
        userProfile.country,
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const completionPercentage = Math.round((completedFields / profileFields.length) * 100);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                    <p className="text-muted-foreground mt-1">View and manage your account details</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={userProfile.kyc_status === 'verified' ? 'default' : 'secondary'} className="px-3 py-1">
                        {userProfile.kyc_status === 'verified' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> KYC Verified</>
                        ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> KYC Pending</>
                        )}
                    </Badge>
                    <Badge variant={isAdminProfile(userProfile) ? 'default' : 'outline'} className="px-3 py-1">
                        {isAdminProfile(userProfile) ? 'Administrator' : 'Member'}
                    </Badge>
                    {isAdminProfile(userProfile) && (
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Link href="/admin">Open admin panel</Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Profile Header Card */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-card via-card to-muted/50">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar - Auto-generated, no upload */}
                        <div className="relative">
                            <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                                <AvatarImage
                                    src={`https://picsum.photos/seed/${user?.uid}/200/200`}
                                    alt={userProfile.display_name}
                                />
                                <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                    {userProfile.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-2 border-background">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold">
                                    {userProfile.display_name || 'Unnamed User'}
                                </h2>
                                {userProfile.username && (
                                    <p className="text-muted-foreground">@{userProfile.username}</p>
                                )}
                                {/* Level Badge */}
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                    <Badge className={`${levelInfo.color} text-white px-3 py-1`}>
                                        <Star className="w-3 h-3 mr-1" />
                                        Level {levelInfo.level} - {levelInfo.name}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {levelInfo.income_percent}% daily earnings
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {userProfile.email}
                                </span>
                                {userProfile.created_at && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Joined {formatDateSafe(userProfile.created_at, 'MMM yyyy')}
                                    </span>
                                )}
                            </div>

                            {userProfile.bio && (
                                <p className="text-sm text-muted-foreground max-w-lg mt-2">
                                    {userProfile.bio}
                                </p>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="flex md:flex-col gap-4 md:gap-2 text-center md:text-right">
                            <div>
                                <p className="text-2xl font-bold text-primary">${userProfile.balance?.toLocaleString('en-US') || '0'}</p>
                                <p className="text-xs text-muted-foreground">Balance</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-orange-500">${userProfile.referral_balance?.toLocaleString('en-US') || '0'}</p>
                                <p className="text-xs text-muted-foreground">Referral</p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Completion */}
                    <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Profile Completion</span>
                            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            Complete your profile to unlock all features
                        </p>
                    </div>

                    {/* Level Progress */}
                    {nextLevel && (
                        <div className="mt-6 pt-6 border-t">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    Progress to {nextLevel.name} (Level {nextLevel.level})
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    ${currentBalance.toLocaleString('en-US')} / ${nextLevel.min.toLocaleString('en-US')}
                                </span>
                            </div>
                            <Progress value={Math.min(progressToNext, 100)} className="h-3" />
                            <div className="flex justify-between mt-2">
                                <p className="text-xs text-muted-foreground">
                                    Earn ${(nextLevel.min - currentBalance).toLocaleString('en-US')} more to reach {nextLevel.name}
                                </p>
                                <p className="text-xs font-medium text-primary">
                                    +{nextLevel.income_percent}% daily
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Current Level Earnings */}
                    <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                Your Daily Earnings
                            </span>
                            <span className="text-sm text-muted-foreground">
                                Level {levelInfo.level} ({levelInfo.income_percent}%)
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3">
                            <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                <p className="text-lg font-bold text-green-600">${currentLevelDailyEarnings.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Daily</p>
                            </div>
                            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                                <p className="text-lg font-bold text-blue-600">${currentLevelWeeklyEarnings.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Weekly</p>
                            </div>
                            <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                                <p className="text-lg font-bold text-purple-600">${currentLevelMonthlyEarnings.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Monthly</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-blue-500" />
                            Total Invested
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">${totalInvested.toLocaleString('en-US')}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Expected Returns
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-600">${totalReturns.toLocaleString('en-US')}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" />
                            Active Plans
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{activeInvestments}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            Daily Claim
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-orange-600">${userProfile.daily_claim_amount || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Profit Calculator */}
            <Card className="border-l-4 border-l-cyan-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-cyan-500" />
                        Daily Profit Calculator
                    </CardTitle>
                    <CardDescription>Calculate your potential earnings based on investment amount</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Label htmlFor="calc-amount">Enter Amount ($)</Label>
                            <Input
                                id="calc-amount"
                                type="number"
                                placeholder="Enter amount to calculate"
                                value={calculatorAmount}
                                onChange={(e) => setCalculatorAmount(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Level</p>
                            <Badge className={`${calcLevelInfo.color} text-white mt-1`}>
                                {calcLevelInfo.name} ({calcLevelInfo.income_percent}%)
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="text-2xl font-bold text-green-600">${calcDailyEarnings.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Daily Earnings</p>
                        </div>
                        <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-2xl font-bold text-blue-600">${calcWeeklyEarnings.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Weekly Earnings</p>
                        </div>
                        <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-2xl font-bold text-purple-600">${calcMonthlyEarnings.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Monthly Earnings</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Level Structure Reference */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        Deposit tiers (daily income)
                    </CardTitle>
                    <CardDescription>
                        How much you invest sets your daily % — not referral depth. Referral rewards use 3 upline levels only (see Referrals page).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-5">
                        {getLiveInvestmentLevels().map((level) => (
                            <div
                                key={level.level}
                                className={`p-3 rounded-lg text-center border-2 ${level.level === levelInfo.level
                                    ? 'border-primary bg-primary/10'
                                    : 'border-muted'
                                    }`}
                            >
                                <Badge className={`${level.color} text-white mb-2`}>
                                    Level {level.level}
                                </Badge>
                                <p className="font-semibold text-sm">{level.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    ${level.min}-${level.max}
                                </p>
                                <p className="text-sm font-bold text-green-600 mt-1">
                                    {level.income_percent}%
                                </p>
                                <p className="text-xs text-muted-foreground">daily</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Account Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Account Details
                        </CardTitle>
                        <CardDescription>Your account information and identifiers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Hash className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Support ID</p>
                                        <p className="text-xs text-muted-foreground">For support queries</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 bg-primary/10 rounded text-sm font-mono font-semibold text-primary">
                                        {userProfile.support_id ? formatSupportId(userProfile.support_id) : 'N/A'}
                                    </code>
                                    {userProfile.support_id && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => copyToClipboard(userProfile.support_id, 'supportId')}
                                        >
                                            {copied === 'supportId' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">User ID</p>
                                        <p className="text-xs text-muted-foreground">Unique identifier</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 bg-muted rounded text-xs font-mono max-w-[120px] truncate">
                                        {user?.uid}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => copyToClipboard(user?.uid || '', 'userId')}
                                    >
                                        {copied === 'userId' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Email Address</p>
                                        <p className="text-xs text-muted-foreground">Login email</p>
                                    </div>
                                </div>
                                <span className="text-sm">{userProfile.email}</span>
                            </div>

                            {userProfile.phone && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground">📱</span>
                                        <div>
                                            <p className="text-sm font-medium">Phone Number</p>
                                            <p className="text-xs text-muted-foreground">Contact number</p>
                                        </div>
                                    </div>
                                    <span className="text-sm">{userProfile.phone}</span>
                                </div>
                            )}

                            {userProfile.country && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground">🌍</span>
                                        <div>
                                            <p className="text-sm font-medium">Country</p>
                                            <p className="text-xs text-muted-foreground">Location</p>
                                        </div>
                                    </div>
                                    <span className="text-sm">{userProfile.country}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>Your latest transactions and activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentTransactions && recentTransactions.length > 0 ? (
                            <div className="space-y-3">
                                {recentTransactions.map((tx: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                                                tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                                                    tx.type === 'investment' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-[#1a1a1a] text-gray-400'
                                                }`}>
                                                {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'investment' ? '📈' : '💰'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium capitalize">{tx.type}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateSafe(tx.created_at, 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${tx.type === 'deposit' || tx.type === 'referral_bonus' ? 'text-green-600' :
                                                tx.type === 'withdrawal' ? 'text-red-600' :
                                                    'text-foreground'
                                                }`}>
                                                {tx.type === 'deposit' || tx.type === 'referral_bonus' ? '+' : '-'}${toNumber(tx.amount).toLocaleString('en-US')}
                                            </p>
                                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                                {tx.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No recent activity</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Investment Summary */}
            {investments && investments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Investment Summary
                        </CardTitle>
                        <CardDescription>Your active and past investments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {investments.slice(0, 3).map((inv: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl">
                                            📊
                                        </div>
                                        <div>
                                            <p className="font-semibold">{inv.plan_name || 'Investment Plan'}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Started {formatDateSafe(inv.created_at ?? inv.start_date, 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">${toNumber(inv.amount).toLocaleString('en-US')}</p>
                                        <p className="text-sm text-green-600">
                                            +${(toNumber(inv.total_return ?? inv.expected_return) - toNumber(inv.amount)).toLocaleString('en-US')} expected
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Team Commission Section */}
            <Card className="border-l-4 border-l-yellow-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-yellow-500" />
                        Team Commission
                    </CardTitle>
                    <CardDescription>Your earnings from team referrals</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <p className="text-3xl font-bold text-yellow-600">
                                ${userProfile.total_team_commission?.toLocaleString('en-US') || '0'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Total Commission</p>
                        </div>
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="text-3xl font-bold text-green-600">
                                ${userProfile.referral_balance?.toLocaleString('en-US') || '0'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Available Balance</p>
                        </div>
                        <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-3xl font-bold text-blue-600">
                                {userProfile.referral_count || 0}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Total Referrals</p>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">Commission Structure</p>
                        <div className="grid gap-2 md:grid-cols-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Level 1:</span>
                                <span className="font-semibold text-blue-600">{DEFAULT_REFERRAL_SETTINGS.level1_percent}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Level 2:</span>
                                <span className="font-semibold text-green-600">{DEFAULT_REFERRAL_SETTINGS.level2_percent}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Level 3:</span>
                                <span className="font-semibold text-purple-600">{DEFAULT_REFERRAL_SETTINGS.level3_percent}%</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

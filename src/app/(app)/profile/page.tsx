'use client';

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
    ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { formatSupportId } from '@/lib/support-id';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function ProfilePage() {
    const { user, userProfile, isUserLoading } = useUser();
    const { toast } = useToast();
    const [copied, setCopied] = useState<string | null>(null);

    // Fetch user's investments
    const investmentsOptions = useMemo(() => ({
        table: 'investments',
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

    const totalInvested = investments?.reduce((sum, inv: any) => sum + (inv.amount || 0), 0) || 0;
    const totalReturns = investments?.reduce((sum, inv: any) => sum + (inv.expected_return || 0), 0) || 0;
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
                    <Badge variant={userProfile.role === 'admin' ? 'default' : 'outline'} className="px-3 py-1">
                        {userProfile.role === 'admin' ? 'Administrator' : 'Member'}
                    </Badge>
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
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {userProfile.email}
                                </span>
                                {userProfile.created_at && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Joined {format(new Date(userProfile.created_at), 'MMM yyyy')}
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
                                <p className="text-2xl font-bold text-primary">${userProfile.balance?.toLocaleString() || '0'}</p>
                                <p className="text-xs text-muted-foreground">Balance</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-orange-500">${userProfile.referral_balance?.toLocaleString() || '0'}</p>
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
                        <p className="text-2xl font-bold">${totalInvested.toLocaleString()}</p>
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
                        <p className="text-2xl font-bold text-green-600">${totalReturns.toLocaleString()}</p>
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
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                                    tx.type === 'withdrawal' ? 'bg-red-100 text-red-600' :
                                                        tx.type === 'investment' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'investment' ? '📈' : '💰'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium capitalize">{tx.type}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {tx.created_at ? format(new Date(tx.created_at), 'MMM d, yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${tx.type === 'deposit' || tx.type === 'referral_bonus' ? 'text-green-600' :
                                                    tx.type === 'withdrawal' ? 'text-red-600' :
                                                        'text-foreground'
                                                }`}>
                                                {tx.type === 'deposit' || tx.type === 'referral_bonus' ? '+' : '-'}${tx.amount?.toLocaleString()}
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
                                                Started {inv.created_at ? format(new Date(inv.created_at), 'MMM d, yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">${inv.amount?.toLocaleString()}</p>
                                        <p className="text-sm text-green-600">+${(inv.expected_return - inv.amount)?.toLocaleString()} expected</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

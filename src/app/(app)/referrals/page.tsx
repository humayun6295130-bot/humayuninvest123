"use client";

import { useState, useMemo } from "react";
import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
    Users,
    Copy,
    Share2,
    DollarSign,
    TrendingUp,
    Gift,
    Wallet,
    ArrowRight,
    UserPlus,
    Network,
    History,
    ChevronRight,
    Award,
    Download,
    CheckCircle,
    Clock,
    AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Referral {
    id: string;
    referred_user_id: string;
    referred_email: string;
    referred_name?: string;
    level: number;
    commission_percent: number;
    total_commission: number;
    total_invested: number;
    status: 'active' | 'inactive';
    created_at: string;
}

interface ReferralBonus {
    id: string;
    user_id: string;
    from_user_id?: string;
    from_user_email?: string;
    amount: number;
    type: 'commission' | 'manual' | 'bonus';
    level?: number;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface ReferralWithdrawal {
    id: string;
    user_id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    processed_at?: string;
}

export default function ReferralsPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

    // Fetch referrals
    const referralsOptions = useMemo(() => ({
        table: 'referrals',
        filters: user ? [{ column: 'referrer_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    // Fetch referral bonuses
    const bonusesOptions = useMemo(() => ({
        table: 'referral_bonuses',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        limitCount: 50,
        enabled: !!user,
    }), [user]);

    // Fetch referral withdrawals
    const withdrawalsOptions = useMemo(() => ({
        table: 'referral_withdrawals',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'requested_at', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    const { data: referrals, isLoading } = useRealtimeCollection<Referral>(referralsOptions);
    const { data: bonuses } = useRealtimeCollection<ReferralBonus>(bonusesOptions);
    const { data: withdrawals } = useRealtimeCollection<ReferralWithdrawal>(withdrawalsOptions);

    const referralLink = userProfile?.referral_code
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${userProfile.referral_code}`
        : '';

    // Calculate statistics
    const totalReferrals = referrals?.length || 0;
    const level1Referrals = referrals?.filter(r => r.level === 1) || [];
    const level2Referrals = referrals?.filter(r => r.level === 2) || [];
    const level3Referrals = referrals?.filter(r => r.level === 3) || [];

    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
    const totalCommission = bonuses?.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.amount, 0) || 0;
    const pendingCommission = bonuses?.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0) || 0;

    const referralWallet = userProfile?.referral_balance || 0;
    const totalWithdrawn = withdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0) || 0;

    const copyToClipboard = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast({
                title: "Copied!",
                description: "Referral link copied to clipboard.",
            });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareReferral = async () => {
        if (navigator.share && referralLink) {
            try {
                await navigator.share({
                    title: 'Join InvestPro',
                    text: 'Join me on InvestPro and start earning with investment plans! Use my referral code.',
                    url: referralLink,
                });
            } catch (err) {
                copyToClipboard();
            }
        } else {
            copyToClipboard();
        }
    };

    const handleWithdraw = async () => {
        if (!user) return;

        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount" });
            return;
        }

        if (amount > referralWallet) {
            toast({ variant: "destructive", title: "Insufficient Balance", description: "You don't have enough referral earnings" });
            return;
        }

        setIsWithdrawing(true);
        try {
            await insertRow('referral_withdrawals', {
                user_id: user.uid,
                user_email: userProfile?.email,
                amount: amount,
                status: 'pending',
                requested_at: new Date().toISOString(),
            });

            toast({
                title: "Withdrawal Requested!",
                description: `Your withdrawal request for $${amount.toFixed(2)} is pending approval.`,
            });

            setWithdrawAmount("");
            setShowWithdrawDialog(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsWithdrawing(false);
        }
    };

    const getCommissionRates = () => {
        const settings = userProfile?.referral_settings || { level1: 5, level2: 2, level3: 1 };
        return settings;
    };

    const rates = getCommissionRates();

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <Users className="mx-auto h-12 w-12 animate-pulse text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading referrals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Referral Program</h1>
                    <p className="text-muted-foreground">Invite friends and earn commissions on their investments</p>
                </div>
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Referral Balance</p>
                                <p className="text-lg font-bold">${referralWallet.toFixed(2)}</p>
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
                            <Users className="h-4 w-4 text-blue-500" />
                            Total Referrals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReferrals}</div>
                        <p className="text-xs text-muted-foreground">{activeReferrals} active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Total Earned
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${totalCommission.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">${pendingCommission.toFixed(2)} pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            Available
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">${referralWallet.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Can withdraw</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Download className="h-4 w-4 text-orange-500" />
                            Withdrawn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalWithdrawn.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total withdrawn</p>
                    </CardContent>
                </Card>
            </div>

            {/* Referral Link Card */}
            <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                Your Referral Link
                            </h3>
                            <p className="text-primary-foreground/80">Share this link and earn up to {rates.level1}% commission</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                value={referralLink}
                                readOnly
                                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 min-w-[300px]"
                            />
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={copyToClipboard}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                                <Button variant="secondary" onClick={shareReferral}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Commission Structure */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Network className="h-5 w-5" />
                                Commission Structure
                            </CardTitle>
                            <CardDescription>Earn from 3 levels of referrals</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4 text-center">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-white font-bold text-lg">1</span>
                                    </div>
                                    <h4 className="font-semibold text-lg">{rates.level1}%</h4>
                                    <p className="text-sm text-muted-foreground">Level 1</p>
                                    <p className="text-xs text-muted-foreground mt-1">Direct referrals</p>
                                    <Badge className="mt-2" variant="secondary">{level1Referrals.length} users</Badge>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 text-center">
                                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-white font-bold text-lg">2</span>
                                    </div>
                                    <h4 className="font-semibold text-lg">{rates.level2}%</h4>
                                    <p className="text-sm text-muted-foreground">Level 2</p>
                                    <p className="text-xs text-muted-foreground mt-1">Referrals' referrals</p>
                                    <Badge className="mt-2" variant="secondary">{level2Referrals.length} users</Badge>
                                </div>
                                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4 text-center">
                                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-white font-bold text-lg">3</span>
                                    </div>
                                    <h4 className="font-semibold text-lg">{rates.level3}%</h4>
                                    <p className="text-sm text-muted-foreground">Level 3</p>
                                    <p className="text-xs text-muted-foreground mt-1">Extended network</p>
                                    <Badge className="mt-2" variant="secondary">{level3Referrals.length} users</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Referrals List */}
                    <Tabs defaultValue="all" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All ({totalReferrals})</TabsTrigger>
                            <TabsTrigger value="level1">Level 1 ({level1Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level2">Level 2 ({level2Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level3">Level 3 ({level3Referrals.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            <ReferralsList referrals={referrals || []} level={1} />
                        </TabsContent>
                        <TabsContent value="level1">
                            <ReferralsList referrals={level1Referrals} level={1} />
                        </TabsContent>
                        <TabsContent value="level2">
                            <ReferralsList referrals={level2Referrals} level={2} />
                        </TabsContent>
                        <TabsContent value="level3">
                            <ReferralsList referrals={level3Referrals} level={3} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Withdraw */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                Withdraw Earnings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Available Balance</p>
                                <p className="text-3xl font-bold text-primary">${referralWallet.toFixed(2)}</p>
                            </div>
                            <Button
                                className="w-full"
                                disabled={referralWallet <= 0}
                                onClick={() => setShowWithdrawDialog(true)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Withdraw Now
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Bonuses */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Recent Earnings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!bonuses || bonuses.length === 0 ? (
                                <div className="text-center py-6">
                                    <History className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No earnings yet</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                        {bonuses.slice(0, 10).map((bonus) => (
                                            <div key={bonus.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center",
                                                        bonus.type === 'manual' ? "bg-purple-500/10" : "bg-green-500/10"
                                                    )}>
                                                        {bonus.type === 'manual' ? (
                                                            <Gift className="h-4 w-4 text-purple-500" />
                                                        ) : (
                                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">+${bonus.amount.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {bonus.type === 'manual' ? 'Bonus from Admin' : `Level ${bonus.level} Commission`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={bonus.status === 'approved' ? 'default' : 'outline'} className="text-xs">
                                                    {bonus.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    {/* How It Works */}
                    <Card>
                        <CardHeader>
                            <CardTitle>How It Works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold text-sm">1</span>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Share Your Link</p>
                                    <p className="text-xs text-muted-foreground">Copy and share your referral link</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold text-sm">2</span>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Friends Join</p>
                                    <p className="text-xs text-muted-foreground">They sign up and start investing</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold text-sm">3</span>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Earn Commission</p>
                                    <p className="text-xs text-muted-foreground">Get up to {rates.level1}% on their investments</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Withdraw Dialog */}
            <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw Referral Earnings</DialogTitle>
                        <DialogDescription>Request a withdrawal of your referral commissions</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Available Balance</p>
                            <p className="text-2xl font-bold text-primary">${referralWallet.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Withdrawal Amount ($)</Label>
                            <Input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Enter amount"
                                max={referralWallet}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleWithdraw}
                            disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                        >
                            {isWithdrawing ? 'Processing...' : 'Request Withdrawal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ReferralsList({ referrals, level }: { referrals: Referral[]; level: number }) {
    if (referrals.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No referrals at this level yet</p>
                    <p className="text-sm text-muted-foreground">Share your link to invite more friends</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="divide-y">
                    {referrals.map((referral) => (
                        <div key={referral.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center",
                                    referral.level === 1 ? "bg-blue-500/10" :
                                        referral.level === 2 ? "bg-purple-500/10" : "bg-orange-500/10"
                                )}>
                                    <Users className={cn(
                                        "h-5 w-5",
                                        referral.level === 1 ? "text-blue-500" :
                                            referral.level === 2 ? "text-purple-500" : "text-orange-500"
                                    )} />
                                </div>
                                <div>
                                    <p className="font-medium">{referral.referred_name || referral.referred_email}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant="outline" className="text-xs">
                                            Level {referral.level}
                                        </Badge>
                                        <span>{referral.commission_percent}% commission</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-green-600">+${referral.total_commission.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                    Invested: ${referral.total_invested.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useRealtimeCollection } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { generateUniqueReferralCode } from "@/lib/referral-code";
import {
    getReferralSettings,
    DEFAULT_REFERRAL_SETTINGS,
    type ReferralSettings as GlobalReferralSettings,
    REFERRAL_POLICY_HEADLINE,
    REFERRAL_POLICY_DETAIL,
} from "@/lib/referral-system";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
    AlertCircle,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { referralMemberPrimaryLabel, referralMemberSecondaryLabel } from "@/lib/display-user";
import { getWithdrawableUsd } from "@/lib/wallet-totals";
import Link from "next/link";

interface Referral {
    id: string;
    referred_user_id: string;
    referred_email: string;
    referred_name?: string;
    referred_username?: string;
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
    type: 'commission' | 'manual' | 'bonus' | 'investment' | 'daily';
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

/** Bonus / withdrawal line amounts: missing or bad fields must not turn the whole sum into NaN. */
function coerceLedgerUsd(raw: unknown): number {
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
}

/**
 * `referral_bonuses.amount` is canonical; some legacy rows may use `bonus_amount` or strings.
 */
function referralBonusLedgerUsd(b: ReferralBonus): number {
    const ext = b as ReferralBonus & { bonus_amount?: unknown };
    const raw = ext.amount ?? ext.bonus_amount;
    return coerceLedgerUsd(raw);
}

export default function ReferralsPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [globalReferralSettings, setGlobalReferralSettings] = useState<GlobalReferralSettings>(DEFAULT_REFERRAL_SETTINGS);

    // Fetch global referral settings
    useEffect(() => {
        getReferralSettings().then(settings => setGlobalReferralSettings(settings)).catch(() => {});
    }, []);

    // Auto-generate referral code for existing users who don't have one
    useEffect(() => {
        async function generateReferralCodeIfNeeded() {
            if (user && userProfile && !userProfile.referral_code && !isGeneratingCode) {
                setIsGeneratingCode(true);
                try {
                    const newCode = await generateUniqueReferralCode();
                    if (db) {
                        await updateDoc(doc(db, 'users', user.uid), {
                            referral_code: newCode
                        });
                    }
                } catch (error) {
                    console.error('Error generating referral code:', error);
                } finally {
                    setIsGeneratingCode(false);
                }
            }
        }
        generateReferralCodeIfNeeded();
    }, [user, userProfile, isGeneratingCode]);

    // Fetch referrals (no orderBy — composite index not required; sort client-side)
    const referralsOptions = useMemo(() => ({
        table: 'referrals',
        filters: user ? [{ column: 'referrer_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const bonusesOptions = useMemo(() => ({
        table: 'referral_bonuses',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        limitCount: 300,
        enabled: !!user,
    }), [user]);

    const withdrawalsOptions = useMemo(() => ({
        table: 'referral_withdrawals',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const { data: referralsRaw, isLoading } = useRealtimeCollection<Referral>(referralsOptions);
    const { data: bonusesRaw } = useRealtimeCollection<ReferralBonus>(bonusesOptions);
    const { data: withdrawalsRaw } = useRealtimeCollection<ReferralWithdrawal>(withdrawalsOptions);

    const referrals = useMemo(() => {
        if (!referralsRaw?.length) return referralsRaw;
        return [...referralsRaw].sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [referralsRaw]);

    const bonuses = useMemo(() => {
        if (!bonusesRaw?.length) return bonusesRaw;
        return [...bonusesRaw].sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [bonusesRaw]);

    const withdrawals = useMemo(() => {
        if (!withdrawalsRaw?.length) return withdrawalsRaw;
        return [...withdrawalsRaw].sort(
            (a, b) =>
                new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime()
        );
    }, [withdrawalsRaw]);

    /** Real commission credited per team member (from referral_bonuses), keyed by referred user id */
    const commissionByReferredUserId = useMemo(
        () => aggregateCommissionByReferredMember(bonuses ?? undefined),
        [bonuses]
    );

    // Build stable base URL for referral links (prefers NEXT_PUBLIC_BASE_URL, falls back to window.origin, then a safe default)
    const referralBaseUrl = useMemo(() => {
        if (typeof window !== 'undefined' && window.location?.origin) {
            return window.location.origin.replace(/\/+$/, '');
        }
        if (process.env.NEXT_PUBLIC_BASE_URL) {
            return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/+$/, '');
        }
        return 'https://www.bctmine.com';
    }, []);

    // Build referral link with proper fallbacks (code > username)
    const referralLink = useMemo(() => {
        if (userProfile?.referral_code) {
            return `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.referral_code)}`;
        }
        if (userProfile?.username) {
            return `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.username)}`;
        }
        return '';
    }, [userProfile?.referral_code, userProfile?.username, referralBaseUrl]);

    /** Allow copy/share when username fallback link exists; only block while profile/code is generating */
    const isReferralLoading = !userProfile || isGeneratingCode;

    // Calculate statistics
    const totalReferrals = referrals?.length || 0;
    const level1Referrals = referrals?.filter(r => r.level === 1) || [];
    const level2Referrals = referrals?.filter(r => r.level === 2) || [];
    const level3Referrals = referrals?.filter(r => r.level === 3) || [];

    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
    const totalCommission =
        bonuses?.reduce((sum, b) => {
            if (String(b.status || '').toLowerCase() !== 'approved') return sum;
            return sum + referralBonusLedgerUsd(b);
        }, 0) ?? 0;
    const pendingCommission =
        bonuses?.reduce((sum, b) => {
            if (String(b.status || '').toLowerCase() !== 'pending') return sum;
            return sum + referralBonusLedgerUsd(b);
        }, 0) ?? 0;

    const referralWallet = userProfile?.referral_balance || 0;
    const withdrawableTotal = getWithdrawableUsd(userProfile);
    const totalWithdrawn =
        withdrawals?.reduce((sum, w) => {
            if (String(w.status || '').toLowerCase() !== 'approved') return sum;
            return sum + coerceLedgerUsd(w.amount);
        }, 0) ?? 0;

    const copyToClipboard = async () => {
        // Build link with fallback (base URL already normalised)
        let linkToCopy = referralLink;
        if (!linkToCopy && userProfile?.referral_code) {
            linkToCopy = `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.referral_code)}`;
        } else if (!linkToCopy && userProfile?.username) {
            linkToCopy = `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.username)}`;
        }

        if (!linkToCopy || !linkToCopy.includes('/register?ref=')) {
            toast({
                variant: "destructive",
                title: "No Referral Link",
                description: "Please wait while your referral code is being generated.",
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(linkToCopy);
            setCopied(true);
            toast({
                title: "Copied!",
                description: "Referral link copied to clipboard.",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = linkToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                toast({
                    title: "Copied!",
                    description: "Referral link copied to clipboard.",
                });
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackErr) {
                toast({
                    variant: "destructive",
                    title: "Copy Failed",
                    description: "Please copy the link manually: " + linkToCopy,
                });
            }
        }
    };

    const shareReferral = async () => {
        let linkToShare = referralLink;
        if (!linkToShare && userProfile?.referral_code) {
            linkToShare = `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.referral_code)}`;
        } else if (!linkToShare && userProfile?.username) {
            linkToShare = `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.username)}`;
        }

        if (!linkToShare || !linkToShare.includes('/register?ref=')) {
            toast({ variant: "destructive", title: "Error", description: "Please wait while your referral code is being generated." });
            return;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join BTCMine',
                    text: 'Join me on BTCMine and start earning with investment plans! Use my referral code.',
                    url: linkToShare,
                });
            } catch (err) {
                setShowShareOptions(true);
            }
        } else {
            setShowShareOptions(true);
        }
    };

    const shareToSocial = (platform: string) => {
        let linkToShare = referralLink;
        if (!linkToShare && userProfile?.referral_code) {
            linkToShare = `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.referral_code)}`;
        } else if (!linkToShare && userProfile?.username) {
            linkToShare = `${referralBaseUrl}/register?ref=${encodeURIComponent(userProfile.username)}`;
        }

        if (!linkToShare || !linkToShare.includes('/register?ref=')) {
            toast({ variant: "destructive", title: "Error", description: "No referral link available" });
            return;
        }

        const encodedLink = encodeURIComponent(linkToShare);
        const text = encodeURIComponent('Join me on BTCMine and start earning with investment plans!');
        let url = '';

        switch (platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodedLink}&text=${text}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${text}%20${encodedLink}`;
                break;
            case 'telegram':
                url = `https://t.me/share/url?url=${encodedLink}&text=${text}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
                break;
            default:
                return;
        }

        window.open(url, '_blank', 'width=600,height=400');
        setShowShareOptions(false);
    };

    const rates = useMemo(
        () => ({
            level1: globalReferralSettings.level1_percent,
            level2: globalReferralSettings.level2_percent,
            level3: globalReferralSettings.level3_percent,
            daily1: globalReferralSettings.daily_level1_percent ?? DEFAULT_REFERRAL_SETTINGS.daily_level1_percent,
            daily2: globalReferralSettings.daily_level2_percent ?? DEFAULT_REFERRAL_SETTINGS.daily_level2_percent,
            daily3: globalReferralSettings.daily_level3_percent ?? DEFAULT_REFERRAL_SETTINGS.daily_level3_percent,
            dailyEnabled: globalReferralSettings.daily_income_commission_enabled !== false,
        }),
        [globalReferralSettings]
    );

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
                        <p className="text-xs text-muted-foreground">Referral pool (withdraw via Wallet)</p>
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
                            <p className="text-primary-foreground/80">
                                Per-deposit lifetime commission — up to {rates.level1}% on direct referrals’ plan activations (L2/L3 rates in structure below)
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full lg:w-auto">
                            <Input
                                value={referralLink}
                                readOnly
                                placeholder={isReferralLoading ? "Generating referral code..." : "No referral code available"}
                                disabled={isReferralLoading}
                                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 w-full lg:min-w-[280px]"
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={copyToClipboard}
                                    disabled={isReferralLoading}
                                    className="flex-1"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={shareReferral}
                                    disabled={isReferralLoading}
                                    className="flex-1"
                                >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Share Options Panel */}
            {showShareOptions && (
                <Card className="border-primary/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Share via</h4>
                            <Button variant="ghost" size="sm" onClick={() => setShowShareOptions(false)}>
                                Close
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => shareToSocial('facebook')}
                            >
                                <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                Facebook
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => shareToSocial('twitter')}
                            >
                                <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                X (Twitter)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => shareToSocial('whatsapp')}
                            >
                                <MessageCircle className="w-4 h-4 mr-2 shrink-0" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => shareToSocial('telegram')}
                            >
                                <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                                Telegram
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => shareToSocial('linkedin')}
                            >
                                <Linkedin className="w-4 h-4 mr-2 shrink-0" />
                                LinkedIn
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Commission Structure */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Network className="h-5 w-5" />
                                Commission Structure
                            </CardTitle>
                            <CardDescription>
                                Two streams: (1) per-deposit on plan activation, (2) per daily claim on your team’s profit claim — both use 3 uplines (L1 direct, L2, L3). Amounts rounded to cents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Plan deposit (% of deposit)</p>
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

                            <p className="text-xs font-medium text-muted-foreground mt-6 mb-2 uppercase tracking-wide">
                                Daily income commission (% of member’s claim that day)
                            </p>
                            {!rates.dailyEnabled ? (
                                <p className="text-sm text-amber-600 dark:text-amber-500">
                                    Daily income commission is turned off in admin settings.
                                </p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 text-center">
                                        <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">{rates.daily1}%</div>
                                        <p className="text-xs text-muted-foreground mt-1">Level 1 — direct referrer</p>
                                    </div>
                                    <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 text-center">
                                        <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">{rates.daily2}%</div>
                                        <p className="text-xs text-muted-foreground mt-1">Level 2 upline</p>
                                    </div>
                                    <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4 text-center">
                                        <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">{rates.daily3}%</div>
                                        <p className="text-xs text-muted-foreground mt-1">Level 3 upline</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Referrals List */}
                    <Tabs defaultValue="all" className="space-y-4">
                        <div className="px-1">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Next to each person: <span className="font-medium text-foreground">commission you earned from them</span> is summed from your bonus ledger (plan activations + daily claims). This replaces the old row counter that often stayed at $0.
                            </p>
                        </div>
                        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                            <TabsTrigger value="all" className="flex-1 min-w-[60px] text-xs sm:text-sm">All ({totalReferrals})</TabsTrigger>
                            <TabsTrigger value="level1" className="flex-1 min-w-[60px] text-xs sm:text-sm">L1 ({level1Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level2" className="flex-1 min-w-[60px] text-xs sm:text-sm">L2 ({level2Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level3" className="flex-1 min-w-[60px] text-xs sm:text-sm">L3 ({level3Referrals.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            <ReferralsList
                                referrals={referrals || []}
                                depositRates={rates}
                                commissionByReferredUserId={commissionByReferredUserId}
                            />
                        </TabsContent>
                        <TabsContent value="level1">
                            <ReferralsList
                                referrals={level1Referrals}
                                depositRates={rates}
                                commissionByReferredUserId={commissionByReferredUserId}
                            />
                        </TabsContent>
                        <TabsContent value="level2">
                            <ReferralsList
                                referrals={level2Referrals}
                                depositRates={rates}
                                commissionByReferredUserId={commissionByReferredUserId}
                            />
                        </TabsContent>
                        <TabsContent value="level3">
                            <ReferralsList
                                referrals={level3Referrals}
                                depositRates={rates}
                                commissionByReferredUserId={commissionByReferredUserId}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Single withdrawal path: main + referral on Wallet */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="h-5 w-5" />
                                Withdraw
                            </CardTitle>
                            <CardDescription>
                                Main balance and referral earnings are combined for one withdrawal flow on the Wallet page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center p-4 bg-muted rounded-lg space-y-1">
                                <p className="text-sm text-muted-foreground">Total withdrawable</p>
                                <p className="text-3xl font-bold text-primary">${withdrawableTotal.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                    Includes main ${Number(userProfile?.balance ?? 0).toFixed(2)} + referral ${referralWallet.toFixed(2)}
                                </p>
                            </div>
                            {withdrawableTotal <= 0 ? (
                                <Button className="w-full" disabled>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Open Wallet to withdraw
                                </Button>
                            ) : (
                                <Button className="w-full" asChild>
                                    <Link href="/wallet">
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Open Wallet to withdraw
                                    </Link>
                                </Button>
                            )}
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
                                                        <p className="text-sm font-medium">+${referralBonusLedgerUsd(bonus).toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {bonus.type === 'manual'
                                                            ? 'Bonus from Admin'
                                                            : bonus.type === 'daily'
                                                              ? `Level ${bonus.level} daily income commission`
                                                              : `Level ${bonus.level} commission`}
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
                                    <p className="text-xs text-muted-foreground">
                                        Per-deposit lifetime commission: {rates.level1 ?? 5}% / {rates.level2 ?? 3}% / {rates.level3 ?? 2}% on three uplines, each time your team activates an investment — wallet top-ups without a plan do not count.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}

function depositRateForLevel(
    depositRates: { level1: number; level2: number; level3: number },
    referralLevel: number
): number {
    if (referralLevel === 1) return depositRates.level1;
    if (referralLevel === 2) return depositRates.level2;
    return depositRates.level3;
}

type CommissionFromMemberAgg = {
    approvedTotal: number;
    depositStream: number;
    dailyStream: number;
    otherStream: number;
    pendingTotal: number;
    bonusEntries: number;
};

function aggregateCommissionByReferredMember(
    bonuses: ReferralBonus[] | undefined
): Record<string, CommissionFromMemberAgg> {
    const out: Record<string, CommissionFromMemberAgg> = {};
    if (!bonuses?.length) return out;

    for (const b of bonuses) {
        const fromId = typeof b.from_user_id === 'string' ? b.from_user_id.trim() : '';
        if (!fromId) continue;

        const amt = referralBonusLedgerUsd(b);
        if (amt <= 0) continue;

        if (!out[fromId]) {
            out[fromId] = {
                approvedTotal: 0,
                depositStream: 0,
                dailyStream: 0,
                otherStream: 0,
                pendingTotal: 0,
                bonusEntries: 0,
            };
        }
        const row = out[fromId]!;
        const st = String(b.status || '').toLowerCase();
        const typ = String(b.type || '').toLowerCase();

        if (st === 'approved' || st === 'completed') {
            row.approvedTotal += amt;
            row.bonusEntries += 1;
            if (typ === 'daily') {
                row.dailyStream += amt;
            } else if (typ === 'investment' || typ === 'commission' || typ === 'referral_bonus') {
                row.depositStream += amt;
            } else {
                row.otherStream += amt;
            }
        } else if (st === 'pending') {
            row.pendingTotal += amt;
        }
    }

    return out;
}

function fmtUsd(n: number): string {
    return n.toFixed(2);
}

function ReferralsList({
    referrals,
    depositRates,
    commissionByReferredUserId,
}: {
    referrals: Referral[];
    depositRates: { level1: number; level2: number; level3: number };
    commissionByReferredUserId: Record<string, CommissionFromMemberAgg>;
}) {
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
                    {referrals.map((referral) => {
                        const sub = referralMemberSecondaryLabel(referral);
                        const displayRate = depositRateForLevel(depositRates, referral.level);
                        const memberId = referral.referred_user_id;
                        const agg = memberId ? commissionByReferredUserId[memberId] : undefined;
                        const ledgerTotal = agg?.approvedTotal ?? 0;
                        const docTotal = coerceLedgerUsd(referral.total_commission);
                        const totalCredited = ledgerTotal > 0 ? ledgerTotal : docTotal;
                        const parts: string[] = [];
                        if (agg && agg.depositStream > 0.001) {
                            parts.push(`Plan / deposit: $${fmtUsd(agg.depositStream)}`);
                        }
                        if (agg && agg.dailyStream > 0.001) {
                            parts.push(`Daily claims: $${fmtUsd(agg.dailyStream)}`);
                        }
                        if (agg && agg.otherStream > 0.001) {
                            parts.push(`Bonus / other: $${fmtUsd(agg.otherStream)}`);
                        }
                        return (
                        <div key={referral.id} className="p-3 sm:p-4 flex items-start sm:items-center gap-3 hover:bg-muted/50 transition-colors">
                            <div className={cn(
                                "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0",
                                referral.level === 1 ? "bg-blue-500/10" :
                                    referral.level === 2 ? "bg-purple-500/10" : "bg-orange-500/10"
                            )}>
                                <Users className={cn(
                                    "h-4 w-4 sm:h-5 sm:w-5",
                                    referral.level === 1 ? "text-blue-500" :
                                        referral.level === 2 ? "text-purple-500" : "text-orange-500"
                                )} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-medium text-sm truncate">
                                    {referralMemberPrimaryLabel(referral)}
                                </p>
                                {sub && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {sub}
                                    </p>
                                )}
                                <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                                    <Badge variant="outline" className="text-xs">L{referral.level}</Badge>
                                    <span>Your rate on their deposits: {displayRate}%</span>
                                </div>
                                <p className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400/95 font-medium pt-0.5 border-t border-border/60 mt-2">
                                    Commission earned from this member:{' '}
                                    <span className="tabular-nums">${fmtUsd(totalCredited)}</span>
                                    {agg && agg.bonusEntries > 0 ? (
                                        <span className="text-muted-foreground font-normal">
                                            {' '}({agg.bonusEntries} credit{agg.bonusEntries === 1 ? '' : 's'} in ledger)
                                        </span>
                                    ) : null}
                                </p>
                                {parts.length > 0 ? (
                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
                                        {parts.join(' · ')}
                                    </p>
                                ) : totalCredited <= 0 ? (
                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                                        No bonus payouts yet from this member (after they activate plans or claim, you will see amounts here).
                                    </p>
                                ) : null}
                                {agg && agg.pendingTotal > 0.001 ? (
                                    <p className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-500/90">
                                        Pending: ${fmtUsd(agg.pendingTotal)}
                                    </p>
                                ) : null}
                            </div>
                            <div className="text-right shrink-0 space-y-0.5 sm:pl-2 border-l border-border/50 pl-3 sm:min-w-[100px]">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">From them</p>
                                <p className="font-bold text-green-600 dark:text-green-400 text-base tabular-nums">
                                    +${fmtUsd(totalCredited)}
                                </p>
                                {(referral.total_invested || 0) > 0 ? (
                                    <p className="text-[11px] text-muted-foreground tabular-nums">
                                        Their row: ${fmtUsd(referral.total_invested || 0)} vol.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

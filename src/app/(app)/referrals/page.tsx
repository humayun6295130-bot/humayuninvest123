"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/firebase/config";
import { generateUniqueReferralCode } from "@/lib/referral-code";
import { getReferralSettings, DEFAULT_REFERRAL_SETTINGS, type ReferralSettings as GlobalReferralSettings } from "@/lib/referral-system";
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
    AlertCircle,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle
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
        limitCount: 50,
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

    // Build referral link with proper fallbacks
    const referralLink = useMemo(() => {
        if (userProfile?.referral_code) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            return `${origin}/register?ref=${userProfile.referral_code}`;
        }
        // Fallback: use username if available
        if (userProfile?.username) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            return `${origin}/register?ref=${userProfile.username}`;
        }
        return '';
    }, [userProfile?.referral_code, userProfile?.username]);

    /** Allow copy/share when username fallback link exists; only block while profile/code is generating */
    const isReferralLoading = !userProfile || isGeneratingCode;

    // Calculate statistics
    const totalReferrals = referrals?.length || 0;
    const level1Referrals = referrals?.filter(r => r.level === 1) || [];
    const level2Referrals = referrals?.filter(r => r.level === 2) || [];
    const level3Referrals = referrals?.filter(r => r.level === 3) || [];
    const level4Referrals = referrals?.filter(r => r.level === 4) || [];
    const level5Referrals = referrals?.filter(r => r.level === 5) || [];

    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
    const totalCommission = bonuses?.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.amount, 0) || 0;
    const pendingCommission = bonuses?.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0) || 0;

    const referralWallet = userProfile?.referral_balance || 0;
    const totalWithdrawn = withdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0) || 0;

    const copyToClipboard = async () => {
        // Build link with fallback
        let linkToCopy = referralLink;
        if (!linkToCopy && userProfile?.referral_code) {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://btcmine.xyz';
            linkToCopy = `${origin}/register?ref=${userProfile.referral_code}`;
        } else if (!linkToCopy && userProfile?.username) {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://btcmine.xyz';
            linkToCopy = `${origin}/register?ref=${userProfile.username}`;
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
        const linkToShare = referralLink;

        if (!linkToShare) {
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
        const linkToShare = referralLink;

        if (!linkToShare) {
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

    const handleWithdraw = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Please login to withdraw" });
            return;
        }

        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount" });
            return;
        }

        // Get minimum withdrawal from settings
        const settings = userProfile?.referral_settings || { min_withdrawal: 10 };
        const minWithdrawal = settings.min_withdrawal || 10;

        if (amount < minWithdrawal) {
            toast({ variant: "destructive", title: "Minimum Withdrawal", description: `Minimum withdrawal amount is ${minWithdrawal.toFixed(2)}` });
            return;
        }

        if (amount > referralWallet) {
            toast({ variant: "destructive", title: "Insufficient Balance", description: "You don't have enough referral earnings" });
            return;
        }

        setIsWithdrawing(true);
        try {
            const timestampNow = new Date().toISOString();

            // Deduct from referral_balance immediately (locked while pending)
            if (db) {
                await updateDoc(doc(db, 'users', user.uid), {
                    referral_balance: increment(-amount),
                    updated_at: timestampNow,
                });
            }

            // Create withdrawal request record
            await insertRow('referral_withdrawals', {
                user_id: user.uid,
                user_email: userProfile?.email,
                amount: amount,
                status: 'pending',
                requested_at: timestampNow,
            });

            // Create transaction record
            await insertRow('transactions', {
                user_id: user.uid,
                user_email: userProfile?.email,
                type: 'referral_withdrawal',
                amount: amount,
                currency: 'USD',
                status: 'pending',
                description: `Referral earnings withdrawal request`,
                created_at: timestampNow,
            });

            toast({
                title: "Withdrawal Requested!",
                description: `$${amount.toFixed(2)} withdrawal is pending admin approval. Funds are locked.`,
            });

            setWithdrawAmount("");
            setShowWithdrawDialog(false);
        } catch (error: any) {
            console.error('Withdrawal error:', error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to submit withdrawal request" });
        } finally {
            setIsWithdrawing(false);
        }
    };

    const getCommissionRates = () => {
        return {
            level1: globalReferralSettings.level1_percent,
            level2: globalReferralSettings.level2_percent,
            level3: globalReferralSettings.level3_percent,
            level4: globalReferralSettings.level4_percent ?? 1,
            level5: globalReferralSettings.level5_percent ?? 1,
        };
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
                                    disabled={!referralLink || isReferralLoading}
                                    className="flex-1"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={shareReferral}
                                    disabled={!referralLink || isReferralLoading}
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
                            <CardDescription>Earn from 5 levels of referrals — auto-credited on each investment</CardDescription>
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

                                {/* Level 4 */}
                                <div className="p-4 bg-muted/50 rounded-lg text-center">
                                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <TrendingUp className="h-6 w-6 text-yellow-500" />
                                    </div>
                                    <h4 className="font-semibold text-lg">{rates.level4 || 4}%</h4>
                                    <p className="text-sm text-muted-foreground">Level 4</p>
                                    <p className="text-xs text-muted-foreground mt-1">Extended network</p>
                                    <Badge className="mt-2" variant="secondary">{level4Referrals.length} users</Badge>
                                </div>

                                {/* Level 5 */}
                                <div className="p-4 bg-muted/50 rounded-lg text-center">
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <TrendingUp className="h-6 w-6 text-purple-500" />
                                    </div>
                                    <h4 className="font-semibold text-lg">{rates.level5 || 5}%</h4>
                                    <p className="text-sm text-muted-foreground">Level 5</p>
                                    <p className="text-xs text-muted-foreground mt-1">Extended network</p>
                                    <Badge className="mt-2" variant="secondary">{level5Referrals.length} users</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Referrals List */}
                    <Tabs defaultValue="all" className="space-y-4">
                        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                            <TabsTrigger value="all" className="flex-1 min-w-[60px] text-xs sm:text-sm">All ({totalReferrals})</TabsTrigger>
                            <TabsTrigger value="level1" className="flex-1 min-w-[60px] text-xs sm:text-sm">L1 ({level1Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level2" className="flex-1 min-w-[60px] text-xs sm:text-sm">L2 ({level2Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level3" className="flex-1 min-w-[60px] text-xs sm:text-sm">L3 ({level3Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level4" className="flex-1 min-w-[60px] text-xs sm:text-sm">L4 ({level4Referrals.length})</TabsTrigger>
                            <TabsTrigger value="level5" className="flex-1 min-w-[60px] text-xs sm:text-sm">L5 ({level5Referrals.length})</TabsTrigger>
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
                        <TabsContent value="level4">
                            <ReferralsList referrals={level4Referrals} level={4} />
                        </TabsContent>
                        <TabsContent value="level5">
                            <ReferralsList referrals={level5Referrals} level={5} />
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
                                    <p className="text-xs text-muted-foreground">Get up to {rates.level1 || 1}% + {rates.level2 || 2}% + {rates.level3 || 3}% + {rates.level4 || 4}% + {rates.level5 || 5}% on their investments</p>
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
                        <div key={referral.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                            <div className={cn(
                                "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0",
                                referral.level === 1 ? "bg-blue-500/10" :
                                    referral.level === 2 ? "bg-purple-500/10" : "bg-orange-500/10"
                            )}>
                                <Users className={cn(
                                    "h-4 w-4 sm:h-5 sm:w-5",
                                    referral.level === 1 ? "text-blue-500" :
                                        referral.level === 2 ? "text-purple-500" : "text-orange-500"
                                )} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{referral.referred_name || referral.referred_email}</p>
                                <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                                    <Badge variant="outline" className="text-xs">L{referral.level}</Badge>
                                    <span>{referral.commission_percent}% rate</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-semibold text-green-600 text-sm">+${(referral.total_commission || 0).toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                    ${(referral.total_invested || 0).toFixed(2)} invested
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

"use client";

import { useState, useMemo } from "react";
import { useUser, useRealtimeCollection } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Share2, DollarSign, TrendingUp, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Referral {
    id: string;
    referred_email: string;
    level: number;
    commission_percent: number;
    total_commission: number;
    status: string;
    created_at: string;
}

export default function ReferralsPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const referralsOptions = useMemo(() => ({
        table: 'referrals',
        filters: user ? [{ column: 'referrer_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    const { data: referrals, isLoading } = useRealtimeCollection<Referral>(referralsOptions);

    const referralLink = userProfile?.referral_code
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${userProfile.referral_code}`
        : '';

    const totalReferrals = referrals?.length || 0;
    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
    const totalCommission = referrals?.reduce((sum, r) => sum + r.total_commission, 0) || 0;

    const level1Referrals = referrals?.filter(r => r.level === 1) || [];
    const level2Referrals = referrals?.filter(r => r.level === 2) || [];

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
                    title: 'Join AscendFolio',
                    text: 'Join me on AscendFolio and start earning with investment plans!',
                    url: referralLink,
                });
            } catch (err) {
                copyToClipboard();
            }
        } else {
            copyToClipboard();
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading referrals...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#334C99]">Referral Program</h1>
                <p className="text-muted-foreground">Invite friends and earn commissions</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Total Referrals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReferrals}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Active Referrals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeReferrals}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Total Commission
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#334C99]">${totalCommission.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Commission Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">5%</div>
                        <p className="text-xs text-muted-foreground">Level 1 | 2% Level 2</p>
                    </CardContent>
                </Card>
            </div>

            {/* Referral Link Card */}
            <Card className="bg-gradient-to-r from-[#334C99] to-[#52BBDB] text-white">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-semibold">Your Referral Link</h3>
                            <p className="text-white/80">Share this link with friends and earn commissions on their investments</p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={referralLink}
                                readOnly
                                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 w-64"
                            />
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
                </CardContent>
            </Card>

            {/* Commission Structure */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Level 1 Commission</CardTitle>
                        <CardDescription>Direct referrals - 5% commission</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#334C99]">5%</div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Earn 5% commission on all investments made by your direct referrals
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Level 2 Commission</CardTitle>
                        <CardDescription>Indirect referrals - 2% commission</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#52BBDB]">2%</div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Earn 2% commission on all investments made by your referrals' referrals
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Referrals List */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">All Referrals ({totalReferrals})</TabsTrigger>
                    <TabsTrigger value="level1">Level 1 ({level1Referrals.length})</TabsTrigger>
                    <TabsTrigger value="level2">Level 2 ({level2Referrals.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <ReferralsList referrals={referrals || []} />
                </TabsContent>

                <TabsContent value="level1">
                    <ReferralsList referrals={level1Referrals} />
                </TabsContent>

                <TabsContent value="level2">
                    <ReferralsList referrals={level2Referrals} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ReferralsList({ referrals }: { referrals: Referral[] }) {
    if (referrals.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No referrals yet</p>
                    <p className="text-sm text-muted-foreground">Share your referral link to start earning!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="divide-y">
                    {referrals.map((referral) => (
                        <div key={referral.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-[#334C99]/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-[#334C99]" />
                                </div>
                                <div>
                                    <p className="font-medium">{referral.referred_email}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant="outline">Level {referral.level}</Badge>
                                        <span>{referral.commission_percent}% commission</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-[#334C99]">${referral.total_commission.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Total earned</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

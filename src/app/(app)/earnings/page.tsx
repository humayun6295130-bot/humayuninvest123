"use client";

import { useState, useMemo } from "react";
import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DailyEarning {
    id: string;
    amount: number;
    date: string;
    status: 'credited' | 'pending';
    created_at: string;
}

interface UserInvestment {
    id: string;
    plan_name: string;
    daily_roi: number;
    earned_so_far: number;
    total_return: number;
    status: string;
}

export default function EarningsPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const earningsOptions = useMemo(() => ({
        table: 'daily_earnings',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'date', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    const investmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const { data: earnings, isLoading: earningsLoading } = useRealtimeCollection<DailyEarning>(earningsOptions);
    const { data: investments, isLoading: investmentsLoading } = useRealtimeCollection<UserInvestment>(investmentsOptions);

    const activeInvestments = investments?.filter(inv => inv.status === 'active') || [];
    const totalDailyEarnings = activeInvestments.reduce((sum, inv) => sum + inv.daily_roi, 0);
    const totalEarned = earnings?.filter(e => e.status === 'credited').reduce((sum, e) => sum + e.amount, 0) || 0;
    const pendingEarnings = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0) || 0;

    const todayEarnings = earnings?.filter(e => {
        const earningDate = new Date(e.date);
        const today = new Date();
        return earningDate.toDateString() === today.toDateString();
    }).reduce((sum, e) => sum + e.amount, 0) || 0;

    const handleWithdrawAll = async () => {
        if (!user || !userProfile) return;

        const availableEarnings = activeInvestments.reduce((sum, inv) => sum + inv.daily_roi, 0);

        if (availableEarnings <= 0) {
            toast({
                variant: "destructive",
                title: "No Earnings Available",
                description: "You don't have any earnings to withdraw.",
            });
            return;
        }

        setIsWithdrawing(true);
        try {
            await updateRow('users', user.uid, {
                balance: (userProfile.balance || 0) + availableEarnings,
            });

            await insertRow('transactions', {
                user_id: user.uid,
                type: 'daily_claim',
                amount: availableEarnings,
                status: 'completed',
                description: `Withdraw all earnings - ${format(new Date(), 'yyyy-MM-dd')}`,
            });

            toast({
                title: "Withdrawal Successful!",
                description: `$${availableEarnings.toFixed(2)} has been added to your wallet.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Withdrawal Failed",
                description: error.message,
            });
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleReinvest = async () => {
        toast({
            title: "Coming Soon",
            description: "Auto-reinvest feature will be available soon.",
        });
    };

    if (earningsLoading || investmentsLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading earnings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#334C99]">My Earnings</h1>
                    <p className="text-muted-foreground">Track and manage your investment returns</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReinvest}>
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Reinvest
                    </Button>
                    <Button onClick={handleWithdrawAll} disabled={isWithdrawing || totalDailyEarnings <= 0} className="bg-[#334C99]">
                        <ArrowDownLeft className="mr-2 h-4 w-4" />
                        {isWithdrawing ? 'Processing...' : 'Withdraw All'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Today's Earnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+${todayEarnings.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Daily Earning Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#334C99]">+${totalDailyEarnings.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Per day from all investments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Total Earned
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Pending
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">${pendingEarnings.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Processing earnings</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="sources" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="sources">Earning Sources</TabsTrigger>
                    <TabsTrigger value="history">Earnings History</TabsTrigger>
                </TabsList>

                <TabsContent value="sources" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Investment Sources</CardTitle>
                            <CardDescription>Your current earning sources</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activeInvestments.length === 0 ? (
                                <div className="text-center py-8">
                                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">No active investments</p>
                                    <Button className="mt-4 bg-[#334C99]" onClick={() => window.location.href = '/invest'}>
                                        Browse Plans
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeInvestments.map((investment) => (
                                        <Card key={investment.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-semibold">{investment.plan_name}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Earned: ${investment.earned_so_far.toFixed(2)} / ${investment.total_return.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Daily</p>
                                                        <p className="font-semibold text-green-600">+${investment.daily_roi.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Earnings History</CardTitle>
                            <CardDescription>Your daily earnings over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {earnings?.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No earnings history yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {earnings?.slice(0, 50).map((earning) => (
                                        <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${earning.status === 'credited' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                                    <TrendingUp className={`h-4 w-4 ${earning.status === 'credited' ? 'text-green-600' : 'text-yellow-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Daily Earning</p>
                                                    <p className="text-sm text-muted-foreground">{format(new Date(earning.date), 'MMM dd, yyyy')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600">+${earning.amount.toFixed(2)}</p>
                                                <Badge variant={earning.status === 'credited' ? 'default' : 'secondary'}>
                                                    {earning.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

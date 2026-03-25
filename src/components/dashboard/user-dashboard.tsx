"use client";
import { useUser } from "@/firebase";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, DollarSign, Wallet, ArrowRight, Copy, Bitcoin, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { EarningCounter } from '@/components/invest/EarningCounter';
import { useToast } from "@/hooks/use-toast";
import { INVESTMENT_LEVELS, getUserLevel } from "@/lib/level-config";
import { getAdminWalletAddress } from "@/lib/wallet-config";
import { useState } from "react";

const ADMIN_WALLET = getAdminWalletAddress();

export function UserDashboard({ userProfile }: { userProfile: any }) {
    const { user } = useUser();
    const { toast } = useToast();
    const [copiedAddress, setCopiedAddress] = useState(false);

    const totalInvested = userProfile?.total_invested || 0;
    const totalEarnings = userProfile?.total_earnings || 0;
    const activeInvestments = userProfile?.active_investments_count || 0;
    const userLevel = getUserLevel(totalInvested);

    const copyBep20Address = () => {
        if (ADMIN_WALLET) {
            navigator.clipboard.writeText(ADMIN_WALLET);
            setCopiedAddress(true);
            toast({ title: "Copied!", description: "BEP20 wallet address copied to clipboard" });
            setTimeout(() => setCopiedAddress(false), 2000);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Welcome back, {userProfile?.display_name || 'Investor'}!</h1>
                    <p className="text-muted-foreground mt-1">
                        Get up to 60% profit on your investments. Track your investments and grow your wealth
                    </p>
                </div>
                <Link href="/invest">
                    <Button className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Start Investing
                    </Button>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${totalInvested.toLocaleString('en-US')}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">${totalEarnings.toLocaleString('en-US')}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Your Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">Level {userLevel.level}</div>
                        <p className="text-xs text-muted-foreground">{userLevel.name}</p>
                    </CardContent>
                </Card>
            </div>

            {/* BEP20 Deposit Info */}
            <Card className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 border-orange-500/20">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-orange-500/20">
                            <Coins className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">BEP20 Deposit Address</CardTitle>
                            <CardDescription>Deposit USDT using BNB Smart Chain (BEP20)</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-slate-800 p-3 rounded-lg text-sm break-all font-mono text-orange-300 border border-slate-700">
                            {ADMIN_WALLET || 'Wallet not configured'}
                        </code>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={copyBep20Address}
                            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                            disabled={!ADMIN_WALLET}
                        >
                            {copiedAddress ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Send only USDT (BEP20) to this address. Other tokens may result in permanent loss.
                    </p>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <Wallet className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>My Wallet</CardTitle>
                                <CardDescription>View balance and transactions</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Current Balance: <span className="font-semibold text-foreground">${(userProfile?.balance || 0).toLocaleString('en-US')}</span>
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Link href="/wallet" className="w-full">
                            <Button variant="outline" className="w-full gap-2">
                                View Wallet
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-green-500/10">
                                <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <CardTitle>Daily Earnings</CardTitle>
                                <CardDescription>Claim your daily returns</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Available to claim: <span className="font-semibold text-green-600">${(userProfile?.available_to_claim || 0).toFixed(2)}</span>
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Link href="/earnings" className="w-full">
                            <Button variant="outline" className="w-full gap-2">
                                Claim Earnings
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>

            {/* Investment Levels */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Investment Levels</h2>
                        <p className="text-muted-foreground">Choose a level to start earning daily returns</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {INVESTMENT_LEVELS.map((level) => (
                        <Card key={level.level} className={cn(
                            "flex flex-col h-full border-primary/10 hover:border-primary/30 transition-colors",
                            level.level === 5 && "border-orange-500/50 bg-orange-500/5"
                        )}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Level {level.level}</CardTitle>
                                    <Badge className={cn(
                                        "bg-primary/10 text-primary",
                                        level.level >= 4 && "bg-orange-500/20 text-orange-500"
                                    )}>
                                        {level.dailyIncomePercent}%
                                    </Badge>
                                </div>
                                <CardDescription>{level.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">${level.minInvestment} - ${level.maxInvestment.toLocaleString('en-US')}</div>
                                    <p className="text-xs text-muted-foreground">Investment Range</p>
                                </div>
                                <div className="text-center text-green-600 font-semibold">
                                    {level.dailyIncomePercent}% Daily Returns
                                </div>
                                <ul className="space-y-1 text-xs">
                                    {level.features.slice(0, 3).map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Link href="/invest" className="w-full">
                                    <Button className="w-full" variant={level.level >= 4 ? "default" : "outline"}>
                                        Invest
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

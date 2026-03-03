"use client";
import { useUser } from "@/firebase";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, DollarSign, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";
import { EarningCounter } from '@/components/invest/EarningCounter';
import { useToast } from "@/hooks/use-toast";

const plans = [
    {
        id: "starter",
        name: "Starter Plan",
        price: 25,
        description: "Ideal for those new to investing.",
        features: [
            "Daily ROI: 2%",
            "Duration: 30 days",
            "Total Return: 200%",
            "Email support",
        ],
    },
    {
        id: "growth",
        name: "Growth Plan",
        price: 30,
        description: "Perfect for growing your portfolio.",
        features: [
            "Daily ROI: 2.5%",
            "Duration: 30 days",
            "Total Return: 250%",
            "Priority support",
        ],
    },
    {
        id: "professional",
        name: "Professional Plan",
        price: 50,
        description: "For the serious, active investor.",
        features: [
            "Daily ROI: 3%",
            "Duration: 30 days",
            "Total Return: 300%",
            "24/7 VIP support",
        ],
    },
];

export function UserDashboard({ userProfile }: { userProfile: any }) {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();

    const totalInvested = userProfile?.total_invested || 0;
    const totalEarnings = userProfile?.total_earnings || 0;
    const activeInvestments = userProfile?.active_investments_count || 0;

    if (isUserLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary/20" />
                        <DollarSign className="relative h-12 w-12 animate-pulse text-primary" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Welcome back, {userProfile?.display_name || 'Investor'}!</h1>
                    <p className="text-muted-foreground mt-1">
                        Track your investments and grow your wealth
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
                        <div className="text-3xl font-bold">${totalInvested.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">${totalEarnings.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Plans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{activeInvestments}</div>
                    </CardContent>
                </Card>
            </div>

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
                            Current Balance: <span className="font-semibold text-foreground">${(userProfile?.balance || 0).toLocaleString()}</span>
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

            {/* Investment Plans */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Investment Plans</h2>
                        <p className="text-muted-foreground">Choose a plan to start earning daily returns</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <Card key={plan.name} className="flex flex-col h-full border-primary/10 hover:border-primary/30 transition-colors">
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground">/one-time</span>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <EarningCounter initialAmount={plan.price} />
                            </CardContent>
                            <CardFooter>
                                <Link href="/invest" className="w-full">
                                    <Button className="w-full">
                                        Invest Now
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

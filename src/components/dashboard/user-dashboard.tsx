
"use client";
import { useUser, useDashboardData } from "@/firebase";

import { StatsCards } from '@/components/dashboard/stats-cards';
import { PortfolioChart } from '@/components/dashboard/portfolio-chart';
import { TopHoldings } from '@/components/dashboard/top-holdings';
import { AssetAllocation } from '@/components/dashboard/asset-allocation';
import { Watchlist } from '@/components/dashboard/watchlist';
import { RecentTransactionsSmall } from '@/components/dashboard/recent-transactions-small';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";
import { EarningCounter } from '@/components/invest/EarningCounter';

const plans = [
    {
        name: "Starter Plan",
        price: 25,
        description: "Ideal for those new to investing.",
        features: [
            "Basic market access",
            "Automated portfolio rebalancing",
            "Email support",
        ],
    },
    {
        name: "Growth Plan",
        price: 30,
        description: "Perfect for growing your portfolio.",
        features: [
            "Everything in Starter",
            "Advanced analytics",
            "Priority email support",
        ],
    },
    {
        name: "Professional Plan",
        price: 50,
        description: "For the serious, active investor.",
        features: [
            "Everything in Growth",
            "Deep portfolio analytics",
            "Dedicated phone support",
        ],
    },
];

export function UserDashboard({ userProfile }: { userProfile: any }) {
    const { user, isUserLoading } = useUser();

    // Use optimized dashboard data hook - fetches all data in parallel
    const { data: dashboardData, isLoading: isDashboardLoading } = useDashboardData(user?.uid);
    const { portfolio, assets, transactions } = dashboardData;

    // Show main loading only when user is loading
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

    const isLoading = isDashboardLoading;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card><CardHeader><CardTitle>Total Portfolio Value</CardTitle></CardHeader><CardContent><div className="h-8 w-24 animate-pulse rounded-md bg-muted" /></CardContent></Card>
                    <Card><CardHeader><CardTitle>Account Balance</CardTitle></CardHeader><CardContent><div className="h-8 w-24 animate-pulse rounded-md bg-muted" /></CardContent></Card>
                    <Card><CardHeader><CardTitle>Assets</CardTitle></CardHeader><CardContent><div className="h-8 w-12 animate-pulse rounded-md bg-muted" /></CardContent></Card>
                </div>
            ) : (
                <StatsCards assets={assets || []} balance={userProfile?.balance || 0} />
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <PortfolioChart />
                    <Watchlist />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <AssetAllocation assets={assets || []} />
                    <RecentTransactionsSmall transactions={transactions || []} />
                    <TopHoldings assets={assets || []} />
                </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Investment Plans</h2>
                        <p className="text-muted-foreground">Premium strategies to accelerate your growth.</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {plans.map((plan) => (
                        <Card key={plan.name} className="flex flex-col h-full border-primary/10 hover:border-primary/30 transition-colors">
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground">/ month</span>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <EarningCounter initialAmount={plan.price} />
                            </CardContent>
                            <CardFooter>
                                <Link href="/wallet" className="w-full">
                                    <Button className="w-full" variant={userProfile?.active_plan === plan.name ? "outline" : "default"}>
                                        {userProfile?.active_plan === plan.name ? "Current Plan" : "Choose Plan"}
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

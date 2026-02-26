"use client";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit } from "firebase/firestore";

import { StatsCards } from '@/components/dashboard/stats-cards';
import { PortfolioChart } from '@/components/dashboard/portfolio-chart';
import { TopHoldings } from '@/components/dashboard/top-holdings';
import { AssetAllocation } from '@/components/dashboard/asset-allocation';
import { AIInsightCard } from '@/components/dashboard/ai-insight-card';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, TrendingUp } from "lucide-react";
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
            "AI-powered insights",
            "Dedicated phone support",
        ],
    },
];

export function UserDashboard({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const portfoliosQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/portfolios`), limit(1));
  }, [user, firestore]);

  const { data: portfolios, isLoading: isPortfoliosLoading } = useCollection(portfoliosQuery);
  const portfolio = portfolios?.[0];

  const assetsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !portfolio) return null;
    return collection(firestore, `users/${user.uid}/portfolios/${portfolio.id}/assets`);
  }, [user, firestore, portfolio]);

  const { data: assets, isLoading: isAssetsLoading } = useCollection(assetsQuery);

  const isLoading = isPortfoliosLoading || (!!portfolio && isAssetsLoading);
  const isPro = userProfile?.activePlan === "Professional Plan";

  return (
    <div className="space-y-8">
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
          <AIInsightCard 
            assets={assets || []} 
            userName={userProfile?.displayName || "Investor"} 
            hasProPlan={isPro}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
           <AssetAllocation assets={assets || []} />
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
                            <Button className="w-full" variant={userProfile?.activePlan === plan.name ? "outline" : "default"}>
                                {userProfile?.activePlan === plan.name ? "Current Plan" : "Choose Plan"}
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

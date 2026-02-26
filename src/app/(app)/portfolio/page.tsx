"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, limit, doc } from "firebase/firestore";
import { AssetsTable } from "@/components/portfolio/assets-table";
import { Wallet, TrendingUp, ShieldCheck, PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PortfolioPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userDocRef);

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

  const isLoading = isUserLoading || isPortfoliosLoading || (!!portfolio && isAssetsLoading);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Wallet className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
         <Card className="max-w-xl mx-auto mt-12">
            <CardHeader className="items-center text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Wallet className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>No Portfolio Found</CardTitle>
                <CardDescription>
                    It looks like you don't have a portfolio yet. Create one to start tracking your investments.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button disabled>Create a Portfolio</Button>
            </CardContent>
        </Card>
    );
  }

  const totalValue = assets?.reduce((acc, a) => acc + (a.quantity * a.averageCost), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground">Detailed view of your current holdings and market performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary text-primary-foreground border-none shadow-lg">
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="mt-2 flex items-center gap-1 text-sm bg-white/10 w-fit px-2 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      <span>Tracked Assets</span>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-dashed border-2 flex flex-col justify-center items-center text-center p-6 bg-muted/20 hover:bg-muted/30 transition-colors cursor-help">
              <ShieldCheck className="h-8 w-8 text-green-500 mb-2" />
              <div className="font-semibold text-sm">Protected by Secure Rules</div>
              <p className="text-xs text-muted-foreground mt-1">Your investment data is private and secure.</p>
          </Card>

          <Card className="border-dashed border-2 flex flex-col justify-center items-center text-center p-6 bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="font-semibold text-sm">Active Plan</div>
              <div className="text-xl font-bold text-primary mt-1">{userProfile?.activePlan || "No Plan"}</div>
              <p className="text-xs text-muted-foreground mt-1">Upgrade for AI insights</p>
          </Card>
      </div>

      <AssetsTable
        assets={assets || []}
        portfolioId={portfolio.id}
        userId={user!.uid}
      />
    </div>
  );
}

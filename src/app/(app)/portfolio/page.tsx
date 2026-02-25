"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit } from "firebase/firestore";
import { AssetsTable } from "@/components/portfolio/assets-table";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PortfolioPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // 1. Fetch the user's portfolios (we'll just use the first one for now)
  const portfoliosQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/portfolios`), limit(1));
  }, [user, firestore]);

  const { data: portfolios, isLoading: isPortfoliosLoading } = useCollection(portfoliosQuery);
  const portfolio = portfolios?.[0];

  // 2. Fetch the assets for that portfolio
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
         <Card className="max-w-xl mx-auto">
            <CardHeader className="items-center text-center">
                <Wallet className="h-12 w-12 text-primary" />
                <CardTitle>No Portfolio Found</CardTitle>
                <CardDescription>
                    It looks like you don't have a portfolio yet. Create one to start tracking your investments.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                {/* This button doesn't do anything yet, but it's a placeholder for future functionality */}
                <Button disabled>Create a Portfolio</Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AssetsTable
        assets={assets || []}
        portfolioId={portfolio.id}
        userId={user!.uid}
      />
    </div>
  );
}

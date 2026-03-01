
"use client";

import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { AssetsTable } from "@/components/portfolio/assets-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  DollarSign,
  Package,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  Clock,
  Award,
  AlertCircle
} from "lucide-react";
import { useMemo, useState } from "react";
import { AddAssetDialog } from "@/components/portfolio/add-asset-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  average_cost: number;
  current_price?: number;
  total_value?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  purchase_date?: string;
}

interface PortfolioTransaction {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
  asset_symbol?: string;
  amount: number;
  quantity?: number;
  date: string;
  description?: string;
}

export default function PortfolioPage() {
  const { user, isUserLoading, userProfile } = useUser();
  const { toast } = useToast();
  const [showAddAsset, setShowAddAsset] = useState(false);

  // Fetch portfolio
  const portfoliosOptions = useMemo(() => ({
    table: 'portfolios',
    filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
    limitCount: 1,
    enabled: !!user,
  }), [user]);

  const { data: portfolios, isLoading: isPortfoliosLoading } = useRealtimeCollection(portfoliosOptions);
  const portfolio = portfolios?.[0];

  // Fetch assets
  const assetsOptions = useMemo(() => ({
    table: 'assets',
    filters: portfolio ? [{ column: 'portfolio_id', operator: '==' as const, value: portfolio.id }] : [],
    enabled: !!user && !!portfolio,
  }), [user, portfolio]);

  const { data: assets, isLoading: isAssetsLoading } = useRealtimeCollection<Asset>(assetsOptions);

  // Fetch transactions
  const transactionsOptions = useMemo(() => ({
    table: 'portfolio_transactions',
    filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
    orderByColumn: { column: 'date', direction: 'desc' as const },
    limitCount: 20,
    enabled: !!user,
  }), [user]);

  const { data: transactions } = useRealtimeCollection<PortfolioTransaction>(transactionsOptions);

  const isLoading = isUserLoading || isPortfoliosLoading || (!!portfolio && isAssetsLoading);

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    if (!assets || assets.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
        assetCount: 0,
        bestPerformer: null as Asset | null,
        worstPerformer: null as Asset | null,
        processedAssets: [] as Asset[],
      };
    }

    let totalValue = 0;
    let totalCost = 0;
    let bestPerformer: Asset | null = null;
    let worstPerformer: Asset | null = null;
    let bestPercent = -Infinity;
    let worstPercent = Infinity;

    const processedAssets: Asset[] = assets.map(asset => {
      const cost = asset.quantity * asset.average_cost;
      const currentPrice = asset.current_price || asset.average_cost;
      const value = asset.quantity * currentPrice;
      const profitLoss = value - cost;
      const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;

      totalValue += value;
      totalCost += cost;

      if (profitLossPercent > bestPercent) {
        bestPercent = profitLossPercent;
        bestPerformer = { ...asset, profit_loss_percent: profitLossPercent };
      }
      if (profitLossPercent < worstPercent) {
        worstPercent = profitLossPercent;
        worstPerformer = { ...asset, profit_loss_percent: profitLossPercent };
      }

      return {
        ...asset,
        total_value: value,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
      };
    });

    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalProfitLoss,
      totalProfitLossPercent,
      assetCount: assets.length,
      bestPerformer,
      worstPerformer,
      processedAssets,
    };
  }, [assets]);

  // Calculate asset allocation
  const assetAllocation = useMemo(() => {
    if (!portfolioStats.processedAssets) return [];

    const allocation: Record<string, number> = {};
    portfolioStats.processedAssets.forEach(asset => {
      const type = asset.type || 'Other';
      allocation[type] = (allocation[type] || 0) + (asset.total_value || 0);
    });

    return Object.entries(allocation)
      .map(([type, value]) => ({
        type,
        value,
        percent: portfolioStats.totalValue > 0 ? (value / portfolioStats.totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [portfolioStats]);

  const getAllocationColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    return colors[index % colors.length];
  };

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
          <Button onClick={async () => {
            if (!user) return;
            try {
              await insertRow('portfolios', {
                user_id: user.uid,
                name: 'My Portfolio',
                created_at: new Date().toISOString(),
              });
              toast({ title: "Portfolio Created", description: "Your portfolio has been created successfully." });
            } catch (error: any) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            }
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create a Portfolio
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground">Track your investments and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddAsset(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Value */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${portfolioStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {portfolioStats.assetCount} Assets
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Invested */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolioStats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total capital invested</p>
          </CardContent>
        </Card>

        {/* Profit/Loss */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              portfolioStats.totalProfitLoss >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {portfolioStats.totalProfitLoss >= 0 ? '+' : ''}
              ${portfolioStats.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={cn(
              "flex items-center gap-1 text-sm mt-1",
              portfolioStats.totalProfitLossPercent >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {portfolioStats.totalProfitLossPercent >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {portfolioStats.totalProfitLossPercent >= 0 ? '+' : ''}
              {portfolioStats.totalProfitLossPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        {/* Daily Change */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Today's Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground mt-1">Live updates coming soon</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Assets Table */}
        <div className="lg:col-span-2 space-y-6">
          <AssetsTable
            assets={portfolioStats.processedAssets || []}
            portfolioId={portfolio.id}
            userId={user!.uid}
          />

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            tx.type === 'buy' ? "bg-green-500/10" :
                              tx.type === 'sell' ? "bg-red-500/10" : "bg-blue-500/10"
                          )}>
                            {tx.type === 'buy' ? <TrendingUp className="h-4 w-4 text-green-500" /> :
                              tx.type === 'sell' ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                                <DollarSign className="h-4 w-4 text-blue-500" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm capitalize">{tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.asset_symbol || 'General'} • {new Date(tx.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-medium",
                            tx.type === 'buy' ? "text-red-600" :
                              tx.type === 'sell' || tx.type === 'deposit' ? "text-green-600" : "text-foreground"
                          )}>
                            {tx.type === 'buy' ? '-' : '+'}
                            ${tx.amount.toLocaleString()}
                          </p>
                          {tx.quantity && (
                            <p className="text-xs text-muted-foreground">{tx.quantity} units</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analytics */}
        <div className="space-y-6">
          {/* Asset Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assetAllocation.length === 0 ? (
                <div className="text-center py-6">
                  <PieChart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No allocation data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Visual Bar */}
                  <div className="h-4 w-full rounded-full overflow-hidden flex">
                    {assetAllocation.map((item, idx) => (
                      <div
                        key={item.type}
                        className={cn("h-full", getAllocationColor(idx))}
                        style={{ width: `${item.percent}%` }}
                      />
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="space-y-2">
                    {assetAllocation.map((item, idx) => (
                      <div key={item.type} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", getAllocationColor(idx))} />
                          <span className="capitalize">{item.type}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{item.percent.toFixed(1)}%</span>
                          <span className="text-muted-foreground ml-2">${item.value.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best Performer */}
          {portfolioStats.bestPerformer && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-500" />
                  Best Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{portfolioStats.bestPerformer.name}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  +{(portfolioStats.bestPerformer.profit_loss_percent || 0).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${((portfolioStats.bestPerformer.quantity || 0) * ((portfolioStats.bestPerformer.current_price || portfolioStats.bestPerformer.average_cost || 0))).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Worst Performer */}
          {portfolioStats.worstPerformer && (portfolioStats.worstPerformer.profit_loss_percent || 0) < 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{portfolioStats.worstPerformer.name}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {(portfolioStats.worstPerformer.profit_loss_percent || 0).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${((portfolioStats.worstPerformer.quantity || 0) * ((portfolioStats.worstPerformer.current_price || portfolioStats.worstPerformer.average_cost || 0))).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Investment Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Position</span>
                <span className="font-medium">
                  ${portfolioStats.assetCount > 0 ? (portfolioStats.totalValue / portfolioStats.assetCount).toFixed(2) : '0.00'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Largest Holding</span>
                <span className="font-medium">
                  {portfolioStats.processedAssets?.sort((a, b) => (b.total_value || 0) - (a.total_value || 0))[0]?.symbol || 'N/A'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Portfolio Age</span>
                <span className="font-medium">
                  {portfolio.created_at ?
                    Math.floor((Date.now() - new Date(portfolio.created_at).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
                    : 'New'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Asset Dialog */}
      <AddAssetDialog
        open={showAddAsset}
        onOpenChange={setShowAddAsset}
        portfolioId={portfolio.id}
        userId={user!.uid}
      />
    </div>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, DollarSign, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export function StatsCards({ assets, balance }: { assets: any[], balance: number }) {
  
  const totalValue = assets.reduce((acc, asset) => {
    return acc + (asset.quantity * asset.averageCost);
  }, 0);

  // Simulated daily change for visual appeal
  const dailyChange = totalValue * 0.024; 
  const isPositive = dailyChange >= 0;

  const stats = [
    {
      title: "Portfolio Value",
      value: formatCurrency(totalValue),
      icon: <DollarSign className="h-5 w-5 text-primary" />,
      sub: (
        <div className={`flex items-center text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {formatCurrency(Math.abs(dailyChange))} (2.4%) today
        </div>
      )
    },
    {
        title: "Available Balance",
        value: formatCurrency(balance),
        icon: <Wallet className="h-5 w-5 text-accent" />,
        sub: <span className="text-xs text-muted-foreground">Ready for investment</span>
    },
    {
        title: "Active Holdings",
        value: assets.length,
        icon: <Briefcase className="h-5 w-5 text-muted-foreground" />,
        sub: <span className="text-xs text-muted-foreground">Across different asset types</span>
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index} className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className="p-2 bg-background rounded-full">
                {stat.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="mt-1">{stat.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

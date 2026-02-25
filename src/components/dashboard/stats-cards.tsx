"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, DollarSign, Wallet } from "lucide-react";

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

  const stats = [
    {
      title: "Total Portfolio Value",
      value: formatCurrency(totalValue),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
    },
    {
        title: "Account Balance",
        value: formatCurrency(balance),
        icon: <Wallet className="h-5 w-5 text-muted-foreground" />,
    },
    {
        title: "Total Assets",
        value: assets.length,
        icon: <Briefcase className="h-5 w-5 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

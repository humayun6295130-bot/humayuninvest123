"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { portfolio } from "@/lib/data";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export function StatsCards() {
  const stats = [
    {
      title: "Total Value",
      value: formatCurrency(portfolio.totalValue),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      change: null,
      changeColor: "",
    },
    {
      title: "24h Change",
      value: formatCurrency(portfolio.dailyGainLoss),
      icon:
        portfolio.dailyGainLoss >= 0 ? (
          <TrendingUp className="h-5 w-5 text-green-500" />
        ) : (
          <TrendingDown className="h-5 w-5 text-red-500" />
        ),
      change: formatPercentage(portfolio.dailyGainLossPercentage),
      changeColor: portfolio.dailyGainLoss >= 0 ? "text-green-500" : "text-red-500",
    },
    {
      title: "Total Gain / Loss",
      value: formatCurrency(portfolio.overallGainLoss),
      icon:
        portfolio.overallGainLoss >= 0 ? (
          <TrendingUp className="h-5 w-5 text-green-500" />
        ) : (
          <TrendingDown className="h-5 w-5 text-red-500" />
        ),
      change: formatPercentage(portfolio.overallGainLossPercentage),
      changeColor:
        portfolio.overallGainLoss >= 0 ? "text-green-500" : "text-red-500",
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
            {stat.change && (
                <p className={cn("text-xs text-muted-foreground", stat.changeColor)}>
                    {stat.change} from last day
                </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

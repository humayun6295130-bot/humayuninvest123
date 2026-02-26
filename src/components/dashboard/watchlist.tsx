
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Eye } from "lucide-react";

const popularAssets = [
  { symbol: "BTC", name: "Bitcoin", price: "$68,432.10", change: "+2.4%", up: true },
  { symbol: "ETH", name: "Ethereum", price: "$3,541.25", change: "+1.8%", up: true },
  { symbol: "AAPL", name: "Apple Inc.", price: "$189.45", change: "-0.5%", up: false },
  { symbol: "TSLA", name: "Tesla", price: "$174.12", change: "+4.2%", up: true },
  { symbol: "SOL", name: "Solana", price: "$145.80", change: "-1.2%", up: false },
];

export function Watchlist() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Market Watchlist
          </CardTitle>
          <CardDescription>Popular assets and their 24h performance.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularAssets.map((asset) => (
            <div key={asset.symbol} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex flex-col">
                <span className="font-bold">{asset.symbol}</span>
                <span className="text-xs text-muted-foreground">{asset.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono font-medium">{asset.price}</span>
                <div className={`flex items-center gap-1 text-xs ${asset.up ? 'text-green-500' : 'text-red-500'}`}>
                  {asset.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {asset.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

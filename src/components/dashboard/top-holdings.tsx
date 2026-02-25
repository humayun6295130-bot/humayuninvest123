"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { portfolio } from "@/lib/data";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export function TopHoldings() {
  const topAssets = [...portfolio.assets]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
        <CardDescription>
          Your best performing assets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topAssets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="font-medium">{asset.ticker}</div>
                  <div className="hidden text-sm text-muted-foreground md:inline">
                    {asset.name}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>{formatCurrency(asset.totalValue)}</div>
                  <div className={cn(asset.dailyChange >= 0 ? 'text-green-500' : 'text-red-500', 'text-xs')}>
                    {asset.dailyChange >= 0 ? '+' : ''}{formatCurrency(asset.dailyChange)} ({asset.dailyChangePercentage.toFixed(2)}%)
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

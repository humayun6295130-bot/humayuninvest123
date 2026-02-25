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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export function TopHoldings({ assets }: { assets: any[] }) {

  const topAssets = [...assets]
    .map(asset => ({...asset, totalValue: asset.quantity * asset.averageCost}))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
        <CardDescription>
          Your largest holdings by value.
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
            {topAssets.length > 0 ? topAssets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="font-medium">{asset.symbol}</div>
                  <div className="hidden text-sm text-muted-foreground md:inline">
                    {asset.assetType}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>{formatCurrency(asset.totalValue)}</div>
                  <div className="text-xs text-muted-foreground">
                    {asset.quantity} units @ {formatCurrency(asset.averageCost)}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                        No assets to display.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

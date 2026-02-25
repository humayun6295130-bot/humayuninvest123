"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAssetDialog } from "./add-asset-dialog";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export function AssetsTable() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Investments</CardTitle>
        <AddAssetDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">24h Change</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Total Gain/Loss</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolio.assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="font-medium">{asset.ticker}</div>
                  <div className="text-sm text-muted-foreground">{asset.name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{asset.type}</Badge>
                </TableCell>
                <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.currentPrice)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    asset.dailyChange >= 0 ? "text-green-500" : "text-red-500"
                  )}
                >
                  {asset.dailyChange >= 0 ? "+" : ""}
                  {asset.dailyChangePercentage.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(asset.totalValue)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    asset.gainLoss >= 0 ? "text-green-500" : "text-red-500"
                  )}
                >
                  {formatCurrency(asset.gainLoss)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

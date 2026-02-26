"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Coins, TrendingUp, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddAssetDialog } from "./add-asset-dialog";
import { useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export function AssetsTable({ assets, portfolioId, userId }: { assets: any[], portfolioId: string, userId: string }) {
  const firestore = useFirestore();

  const handleDelete = (assetId: string) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    
    const assetRef = doc(firestore, `users/${userId}/portfolios/${portfolioId}/assets/${assetId}`);
    deleteDocumentNonBlocking(assetRef);
  };

  const processedAssets = assets.map(asset => {
    const totalValue = asset.quantity * asset.averageCost;
    const totalCost = asset.quantity * asset.averageCost;
    const gainLoss = 0; // Simulated gain/loss for UI consistency
    return { ...asset, totalValue, gainLoss };
  });

  const getAssetIcon = (type: string) => {
      switch(type) {
          case 'cryptocurrency': return <Coins className="h-4 w-4" />;
          case 'stock': return <TrendingUp className="h-4 w-4" />;
          default: return <Layers className="h-4 w-4" />;
      }
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div>
            <CardTitle className="text-xl font-bold">Your Assets</CardTitle>
            <CardDescription>Manage and track your individual holdings.</CardDescription>
        </div>
        <AddAssetDialog portfolioId={portfolioId} userId={userId} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px]">Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg. Price</TableHead>
              <TableHead className="text-right font-semibold">Total Value</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedAssets.length > 0 ? processedAssets.map((asset) => (
              <TableRow key={asset.id} className="group transition-colors hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-background transition-colors">
                        {getAssetIcon(asset.assetType)}
                      </div>
                      <div className="font-bold">{asset.symbol}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-[10px] font-bold tracking-wider">
                    {asset.assetType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{asset.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(asset.averageCost)}</TableCell>
                <TableCell className="text-right font-bold text-primary">{formatCurrency(asset.totalValue)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Position
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(asset.id)} className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Position
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                        No assets yet. Add your first position to start tracking performance.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

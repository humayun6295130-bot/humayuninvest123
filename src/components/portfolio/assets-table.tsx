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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // These calculations will be based on the live data
  const processedAssets = assets.map(asset => {
    const totalValue = asset.quantity * asset.averageCost;
    const totalCost = asset.quantity * asset.averageCost;
    const gainLoss = totalValue - totalCost;
    return { ...asset, totalValue, gainLoss };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Investments</CardTitle>
        <AddAssetDialog portfolioId={portfolioId} userId={userId} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Avg. Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Total Gain/Loss</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedAssets.length > 0 ? processedAssets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="font-medium">{asset.symbol}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{asset.assetType}</Badge>
                </TableCell>
                <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.averageCost)}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleDelete(asset.id)} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No assets yet. Add your first asset to get started.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

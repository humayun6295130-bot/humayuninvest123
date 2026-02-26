
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp, Clock } from "lucide-react";
import { format } from "date-fns";

export function RecentTransactionsSmall({ transactions }: { transactions: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4" />
            Recent Activity
        </CardTitle>
        <CardDescription className="text-xs">Your last 3 transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.length > 0 ? (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium capitalize">{tx.type}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2 w-2" />
                    {tx.timestamp ? format(tx.timestamp.toDate(), 'MMM d, HH:mm') : 'Just now'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold">${tx.amount.toFixed(2)}</span>
                <Badge variant="outline" className={`text-[9px] h-4 px-1 ${getStatusColor(tx.status)}`}>
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-center text-muted-foreground py-4">No recent activity.</p>
        )}
      </CardContent>
    </Card>
  );
}

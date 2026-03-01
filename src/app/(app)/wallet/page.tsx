'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Wallet as WalletIcon,
  ArrowDownUp,
} from 'lucide-react';
import { useUser, useRealtimeCollection } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import WithdrawDialog from '@/components/wallet/withdraw-dialog';
import DepositDialog from '@/components/wallet/deposit-dialog';
import ClaimDailyDialog from '@/components/wallet/claim-daily-dialog';
import { useMemo } from 'react';

export default function WalletPage() {
  const { user, userProfile } = useUser();

  const transactionsOptions = useMemo(() => ({
    table: 'transactions',
    filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
    orderByColumn: { column: 'created_at', direction: 'desc' as const },
    enabled: !!user,
  }), [user]);

  const { data: transactions } = useRealtimeCollection(transactionsOptions);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'outline';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTransactionTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'default';
      case 'withdrawal':
        return 'secondary';
      case 'investment':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
            </CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile ? formatCurrency(userProfile.balance || 0) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Your total account balance.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Funding Actions</CardTitle>
            <CardDescription>Deposit or withdraw funds from your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4 flex-wrap">
            <DepositDialog userProfile={userProfile} />
            <WithdrawDialog userProfile={userProfile} />
            <ClaimDailyDialog userProfile={userProfile} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5" />
              <CardTitle>Transaction History</CardTitle>
            </div>
            <CardDescription>
              A record of your recent account activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions && transactions.length > 0 ? (
                    transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.created_at ? format(new Date(tx.created_at), 'PPpp') : ''}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getTransactionTypeBadgeVariant(tx.type) as any}
                            className="capitalize"
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.description || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(tx.status) as any}
                            className="capitalize"
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
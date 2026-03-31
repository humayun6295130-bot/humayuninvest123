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
  TrendingUp,
  Gift,
  Shield,
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
import { WithdrawDialogEnhanced } from '@/components/wallet/withdraw-dialog-enhanced';
import DepositDialog from '@/components/wallet/deposit-dialog';
import ClaimDailyDialog from '@/components/wallet/claim-daily-dialog';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

export default function WalletPage() {
  const { user, userProfile } = useUser();

  const transactionsOptions = useMemo(() => ({
    table: 'transactions',
    filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
    enabled: !!user,
  }), [user]);

  const { data: transactionsRaw } = useRealtimeCollection(transactionsOptions);

  const transactions = useMemo(() => {
    if (!transactionsRaw?.length) return transactionsRaw;
    return [...transactionsRaw].sort(
      (a: any, b: any) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [transactionsRaw]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'outline';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      investment: 'Investment',
      daily_claim: 'Daily Profit',
      daily_profit: 'Daily Profit',
      earning_claim: 'Earnings',
      referral_bonus: 'Referral Bonus',
      referral_withdrawal: 'Referral Withdraw',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const income = ['deposit', 'daily_claim', 'daily_profit', 'earning_claim', 'referral_bonus'];
    return income.includes(type) ? 'text-green-500' : 'text-red-400';
  };

  const getAmountSign = (type: string) => {
    const income = ['deposit', 'daily_claim', 'daily_profit', 'earning_claim', 'referral_bonus'];
    return income.includes(type) ? '+' : '-';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Main Balance
            </CardTitle>
            <WalletIcon className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {userProfile ? formatCurrency(userProfile.balance || 0) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Referral Balance
            </CardTitle>
            <Gift className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {userProfile ? formatCurrency(userProfile.referral_balance || 0) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Referral earnings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invested
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {userProfile ? formatCurrency(userProfile.total_investment || 0) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active capital
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Deposit, withdraw, or claim your daily profit</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <DepositDialog userProfile={userProfile} />
          <WithdrawDialogEnhanced userProfile={userProfile} />
          <ClaimDailyDialog userProfile={userProfile} />
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-orange-500" />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardDescription>
            Complete record of your account activity
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
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
                    <TableRow key={tx.id} className="border-border/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {tx.created_at ? format(new Date(tx.created_at), 'MMM dd, yyyy') : ''}
                        <br />
                        <span className="text-[10px]">{tx.created_at ? format(new Date(tx.created_at), 'HH:mm') : ''}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs capitalize whitespace-nowrap"
                        >
                          {getTypeLabel(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="space-y-1">
                          <p className="text-sm truncate">{tx.description || 'N/A'}</p>
                          {tx.blockchain_verified && (
                            <div className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-500">Verified on BSC</span>
                              {tx.transaction_hash && (
                                <a
                                  href={`https://bscscan.com/tx/${tx.transaction_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-500 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3 inline" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(tx.status) as any}
                          className="text-xs capitalize"
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getTypeColor(tx.type)}`}>
                        {getAmountSign(tx.type)}{formatCurrency(Math.abs(tx.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No transactions yet. Deposit or invest to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

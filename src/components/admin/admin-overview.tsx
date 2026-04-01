"use client";

import { useRealtimeCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, DollarSign, ArrowDownUp, ShieldCheck, Link, CheckCircle2, Gift } from "lucide-react";
import { useMemo } from "react";

export function AdminOverview() {
  const usersOptions = useMemo(() => ({
    table: 'users',
    enabled: true,
  }), []);

  const transactionsOptions = useMemo(() => ({
    table: 'transactions',
    enabled: true,
  }), []);

  const pendingTxOptions = useMemo(() => ({
    table: 'transactions',
    filters: [{ column: 'status', operator: '==' as const, value: 'pending' }],
    enabled: true,
  }), []);

  const pendingReferralWdOptions = useMemo(() => ({
    table: 'referral_withdrawals',
    filters: [{ column: 'status', operator: '==' as const, value: 'pending' }],
    enabled: true,
  }), []);

  const { data: users, error: usersError } = useRealtimeCollection(usersOptions);
  const { data: transactions, error: transactionsError } = useRealtimeCollection(transactionsOptions);
  const { data: pendingTxs, error: pendingTxError } = useRealtimeCollection(pendingTxOptions);
  const { data: pendingReferralWds, error: referralWdError } = useRealtimeCollection(pendingReferralWdOptions);

  const overviewError = usersError || transactionsError || pendingTxError || referralWdError;

  const totalUsers = users?.length || 0;
  const totalBalance = users?.reduce((acc: number, user: any) => acc + (user.balance || 0), 0) || 0;
  const totalDeposits = transactions?.filter((t: any) => t.type === 'deposit' && t.status === 'completed')
    .reduce((acc: number, t: any) => acc + t.amount, 0) || 0;
  const pendingCount = pendingTxs?.length || 0;
  const pendingReferralWdCount = pendingReferralWds?.length || 0;

  // Blockchain stats
  const blockchainVerifiedCount = transactions?.filter((t: any) => t.blockchain_verified).length || 0;
  const totalTxCount = transactions?.length || 0;
  const verificationRate = totalTxCount > 0 ? Math.round((blockchainVerifiedCount / totalTxCount) * 100) : 0;

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
      description: "Registered members on platform"
    },
    {
      title: "Platform Balance",
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      description: "Sum of all user account balances"
    },
    {
      title: "Total Volume",
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalDeposits),
      icon: <ArrowDownUp className="h-5 w-5 text-muted-foreground" />,
      description: "Total completed deposits"
    },
    {
      title: "Pending Requests",
      value: pendingCount,
      icon: <ShieldCheck className="h-5 w-5 text-primary" />,
      description: "Transactions awaiting review",
      highlight: pendingCount > 0
    },
    {
      title: "Blockchain Verified",
      value: blockchainVerifiedCount,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      description: `${verificationRate}% verification rate`,
      highlight: blockchainVerifiedCount > 0
    },
    {
      title: "Auto-Verified Tx",
      value: verificationRate + "%",
      icon: <Link className="h-5 w-5 text-blue-500" />,
      description: "Auto-verified via TRON blockchain"
    }
  ];

  return (
    <div className="space-y-4">
      {overviewError && (
        <Alert variant="destructive">
          <AlertTitle>Some overview data failed to load</AlertTitle>
          <AlertDescription>{overviewError.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {stats.map((stat, index) => (
        <Card key={index} className={stat.highlight ? "border-primary/50 shadow-md" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            {stat.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}

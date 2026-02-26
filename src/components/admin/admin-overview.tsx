"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, ArrowDownUp, ShieldCheck } from "lucide-react";

export function AdminOverview() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "users");
  }, [firestore]);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "transactions");
  }, [firestore]);

  const pendingTxQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "transactions"), where("status", "==", "pending"));
  }, [firestore]);

  const { data: users } = useCollection(usersQuery);
  const { data: transactions } = useCollection(transactionsQuery);
  const { data: pendingTxs } = useCollection(pendingTxQuery);

  const totalUsers = users?.length || 0;
  const totalBalance = users?.reduce((acc, user) => acc + (user.balance || 0), 0) || 0;
  const totalDeposits = transactions?.filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((acc, t) => acc + t.amount, 0) || 0;
  const pendingCount = pendingTxs?.length || 0;

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
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
  );
}
"use client";

import { useState, useMemo } from "react";
import { useUser, useRealtimeCollection } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownLeft, ArrowUpRight, Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'investment' | 'daily_claim' | 'referral_bonus';
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    description: string;
    created_at: string;
}

export default function TransactionsPage() {
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const transactionsOptions = useMemo(() => ({
        table: 'transactions',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);

    const { data: transactionsRaw, isLoading } = useRealtimeCollection<Transaction>(transactionsOptions);

    const transactions = useMemo(() => {
        if (!transactionsRaw?.length) return transactionsRaw;
        return [...transactionsRaw].sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [transactionsRaw]);

    const filteredTransactions = transactions?.filter((t) => {
        const matchesSearch = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || t.type === filterType;
        const matchesStatus = filterStatus === "all" || t.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const deposits = filteredTransactions?.filter(t => t.type === 'deposit') || [];
    const withdrawals = filteredTransactions?.filter(t => t.type === 'withdrawal') || [];
    const investments = filteredTransactions?.filter(t => t.type === 'investment') || [];
    const earnings = filteredTransactions?.filter(t => t.type === 'daily_claim' || t.type === 'referral_bonus') || [];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'deposit':
                return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
            case 'withdrawal':
                return <ArrowUpRight className="h-4 w-4 text-red-600" />;
            case 'investment':
                return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
            default:
                return <ArrowDownLeft className="h-4 w-4 text-purple-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-500/20 text-green-400">Completed</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
            case 'failed':
                return <Badge className="bg-red-500/20 text-red-400">Failed</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const exportToCSV = () => {
        if (!filteredTransactions) return;

        const headers = ['Date', 'Type', 'Amount', 'Status', 'Description'];
        const rows = filteredTransactions.map(t => [
            format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
            t.type,
            t.amount,
            t.status,
            t.description
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    const TransactionTable = ({ data }: { data: Transaction[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transactions found
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell>{format(new Date(t.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {getTypeIcon(t.type)}
                                    <span className="capitalize">{t.type.replace('_', ' ')}</span>
                                </div>
                            </TableCell>
                            <TableCell className={t.type === 'deposit' || t.type === 'daily_claim' ? 'text-green-600' : 'text-red-600'}>
                                {t.type === 'deposit' || t.type === 'daily_claim' ? '+' : '-'}${t.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{getStatusBadge(t.status)}</TableCell>
                            <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading transactions...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#334C99]">Transaction History</h1>
                    <p className="text-muted-foreground">View and manage all your transactions</p>
                </div>
                <Button variant="outline" onClick={exportToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            +${deposits.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            -${withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            ${investments.filter(i => i.status === 'completed').reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            +${earnings.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[150px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="deposit">Deposit</SelectItem>
                                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                                    <SelectItem value="investment">Investment</SelectItem>
                                    <SelectItem value="daily_claim">Daily Claim</SelectItem>
                                    <SelectItem value="referral_bonus">Referral</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Tabs */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">All ({filteredTransactions?.length || 0})</TabsTrigger>
                    <TabsTrigger value="deposits">Deposits ({deposits.length})</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals ({withdrawals.length})</TabsTrigger>
                    <TabsTrigger value="investments">Investments ({investments.length})</TabsTrigger>
                    <TabsTrigger value="earnings">Earnings ({earnings.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <Card>
                        <CardContent className="p-0">
                            <TransactionTable data={filteredTransactions || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="deposits">
                    <Card>
                        <CardContent className="p-0">
                            <TransactionTable data={deposits} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawals">
                    <Card>
                        <CardContent className="p-0">
                            <TransactionTable data={withdrawals} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="investments">
                    <Card>
                        <CardContent className="p-0">
                            <TransactionTable data={investments} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="earnings">
                    <Card>
                        <CardContent className="p-0">
                            <TransactionTable data={earnings} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

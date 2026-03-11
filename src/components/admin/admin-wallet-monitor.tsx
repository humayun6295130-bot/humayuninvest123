"use client";

/**
 * Admin Wallet Monitor Component
 * 
 * Features:
 * - Real-time TRX and USDT balance display
 * - Incoming/outgoing transaction history
 * - TRC-20 token details
 * - Auto-refresh balance
 * - Deposit notifications
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWalletBalance, useTransactionHistory } from "@/hooks/use-tron";
import {
    useRealtimeCollection,
    updateRow,
    insertRow,
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    RefreshCw,
    Copy,
    Check,
    Coins,
    Activity,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    Bell,
    AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

import { ADMIN_WALLET_ADDRESS, getAdminWalletAddress, isWalletConfigured } from "@/lib/wallet-config";

export function AdminWalletMonitor() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [copied, setCopied] = useState(false);
    const [lastCheckedTx, setLastCheckedTx] = useState<string>("");

    const adminAddress = getAdminWalletAddress();

    // Validate wallet address is configured
    if (!isWalletConfigured()) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Wallet Not Configured
                    </CardTitle>
                    <CardDescription>
                        Please set NEXT_PUBLIC_ADMIN_WALLET_ADDRESS in your environment variables.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Real-time balance with auto-refresh every 30 seconds
    const { balance, isLoading: balanceLoading, refresh: refreshBalance } = useWalletBalance(
        adminAddress,
        { autoRefresh: true, refreshInterval: 30000 }
    );

    // Transaction history
    const {
        transactions,
        isLoading: txLoading,
        refresh: refreshTx,
    } = useTransactionHistory(adminAddress, {
        limit: 50,
        type: 'all',
    });

    // Pending payment verifications
    const { data: pendingPayments } = useRealtimeCollection({
        table: 'payment_verifications',
        filters: [{ column: 'status', operator: '==', value: 'pending_verification' }],
        orderByColumn: { column: 'submitted_at', direction: 'desc' },
    });

    // Check for new deposits
    useEffect(() => {
        const incomingTx = transactions.filter(
            tx => tx.to_address.toLowerCase() === adminAddress.toLowerCase()
        );

        if (incomingTx.length > 0 && incomingTx[0].transaction_id !== lastCheckedTx) {
            const latestTx = incomingTx[0];

            // Check if this is a new transaction
            if (lastCheckedTx) {
                toast({
                    title: "🔔 New Deposit Detected!",
                    description: `Received ${parseInt(latestTx.quant) / 1e6} USDT from ${latestTx.from_address.slice(0, 8)}...`,
                });
            }

            setLastCheckedTx(latestTx.transaction_id);
        }
    }, [transactions, lastCheckedTx, toast]);

    const copyAddress = () => {
        navigator.clipboard.writeText(adminAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
    };

    const handleRefresh = async () => {
        await Promise.all([refreshBalance(), refreshTx()]);
        toast({ title: "Refreshed", description: "Wallet data updated" });
    };

    const incomingTx = transactions.filter(
        tx => tx.to_address.toLowerCase() === adminAddress.toLowerCase()
    );

    const outgoingTx = transactions.filter(
        tx => tx.from_address.toLowerCase() === adminAddress.toLowerCase()
    );

    const totalIncoming = incomingTx.reduce(
        (sum, tx) => sum + parseInt(tx.quant) / 1e6,
        0
    );

    const totalOutgoing = outgoingTx.reduce(
        (sum, tx) => sum + parseInt(tx.quant) / 1e6,
        0
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Admin Wallet</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="text-xs">{adminAddress}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                    </div>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={balanceLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${balanceLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>USDT Balance</CardDescription>
                        <CardTitle className="text-3xl">
                            {balanceLoading ? (
                                <span className="text-muted-foreground">...</span>
                            ) : (
                                `${balance?.usdtBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="text-green-600">
                            <Coins className="w-3 h-3 mr-1" /> TRC-20
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>TRX Balance</CardDescription>
                        <CardTitle className="text-3xl">
                            {balanceLoading ? (
                                <span className="text-muted-foreground">...</span>
                            ) : (
                                `${balance?.trxBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary">
                            <Activity className="w-3 h-3 mr-1" /> Native
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Incoming</CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                            +{totalIncoming.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="bg-green-50">
                            <TrendingUp className="w-3 h-3 mr-1" /> {incomingTx.length} deposits
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Outgoing</CardDescription>
                        <CardTitle className="text-3xl text-red-600">
                            -{totalOutgoing.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="bg-red-50">
                            <TrendingDown className="w-3 h-3 mr-1" /> {outgoingTx.length} withdrawals
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="incoming">Incoming</TabsTrigger>
                    <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
                    <TabsTrigger value="tokens">Tokens</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>Latest transactions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {txLoading ? (
                                        <p className="text-center text-muted-foreground py-8">Loading transactions...</p>
                                    ) : transactions.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No transactions found</p>
                                    ) : (
                                        transactions.map((tx) => {
                                            const isIncoming = tx.to_address.toLowerCase() === adminAddress.toLowerCase();
                                            const amount = parseInt(tx.quant) / 1e6;

                                            return (
                                                <div
                                                    key={tx.transaction_id}
                                                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${isIncoming ? 'bg-green-100' : 'bg-red-100'}`}>
                                                            {isIncoming ? (
                                                                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                                            ) : (
                                                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">
                                                                {isIncoming ? 'Received' : 'Sent'} {amount.toFixed(2)} USDT
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {isIncoming
                                                                    ? `From: ${tx.from_address.slice(0, 8)}...${tx.from_address.slice(-8)}`
                                                                    : `To: ${tx.to_address.slice(0, 8)}...${tx.to_address.slice(-8)}`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">
                                                            {format(tx.block_ts, 'MMM d, HH:mm')}
                                                        </p>
                                                        <a
                                                            href={`https://tronscan.org/#/transaction/${tx.transaction_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            View <ExternalLink className="w-3 h-3 inline" />
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="incoming">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowDownLeft className="w-5 h-5 text-green-600" />
                                Incoming Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {incomingTx.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No incoming transactions</p>
                                    ) : (
                                        incomingTx.map((tx) => (
                                            <div
                                                key={tx.transaction_id}
                                                className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-bold text-green-800">
                                                        +{(parseInt(tx.quant) / 1e6).toFixed(2)} USDT
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        From: {tx.from_address.slice(0, 12)}...
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline" className="bg-white">
                                                        {tx.confirmed ? 'Confirmed' : 'Pending'}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(tx.block_ts, 'MMM d, yyyy HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outgoing">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowUpRight className="w-5 h-5 text-red-600" />
                                Outgoing Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {outgoingTx.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No outgoing transactions</p>
                                    ) : (
                                        outgoingTx.map((tx) => (
                                            <div
                                                key={tx.transaction_id}
                                                className="flex items-center justify-between p-4 bg-red-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-bold text-red-800">
                                                        -{(parseInt(tx.quant) / 1e6).toFixed(2)} USDT
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        To: {tx.to_address.slice(0, 12)}...
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline" className="bg-white">
                                                        {tx.confirmed ? 'Confirmed' : 'Pending'}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(tx.block_ts, 'MMM d, yyyy HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tokens">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Coins className="w-5 h-5" />
                                TRC-20 Token Balances
                            </CardTitle>
                            <CardDescription>All tokens in the admin wallet</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {balance?.tokens.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No tokens found</p>
                                ) : (
                                    balance?.tokens.map((token) => (
                                        <div
                                            key={token.contractAddress}
                                            className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-full">
                                                    <Coins className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{token.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {token.symbol} • {token.contractAddress.slice(0, 8)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-bold">
                                                {token.balance.toLocaleString('en-US', {
                                                    maximumFractionDigits: token.decimals
                                                })} {token.symbol}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Pending Payments Alert */}
            {pendingPayments && pendingPayments.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800">
                            <Bell className="w-5 h-5" />
                            Pending Verifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-yellow-700">
                            {pendingPayments.length} payment(s) awaiting verification
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

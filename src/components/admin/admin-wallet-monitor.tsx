"use client";

/**
 * Admin wallet monitor — BNB Smart Chain (BEP20 USDT).
 * Balances and tx verification use public JSON-RPC (`NEXT_PUBLIC_BSC_RPC_URL`).
 * Optional `NEXT_PUBLIC_BSCSCAN_API_KEY` enables full history via BscScan; otherwise history is recent blocks only.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWalletBalance, useTransactionHistory } from "@/hooks/use-bep20";
import { useRealtimeCollection } from "@/firebase";
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

import { getAdminWalletAddress, isWalletConfigured } from "@/lib/wallet-config";
import { getAllTokenBalances, type BEP20Transaction } from "@/lib/bep20";

function formatTxAmountWei(value: string): number {
    try {
        const n = BigInt(value || "0");
        return Number(n) / 1e18;
    } catch {
        return parseFloat(value || "0") / 1e18;
    }
}

export function AdminWalletMonitor() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [copied, setCopied] = useState(false);
    const [lastCheckedTx, setLastCheckedTx] = useState<string>("");
    const [tokenList, setTokenList] = useState<{ symbol: string; balance: number }[]>([]);
    const [tokensLoading, setTokensLoading] = useState(false);

    const adminAddress = getAdminWalletAddress();
    const walletReady = isWalletConfigured();

    const { balance, isLoading: balanceLoading, refresh: refreshBalance } = useWalletBalance(
        walletReady ? adminAddress : "",
        { autoRefresh: walletReady, refreshInterval: 30000 }
    );

    const {
        transactions,
        isLoading: txLoading,
        refresh: refreshTx,
    } = useTransactionHistory(walletReady ? adminAddress : "", {
        limit: 50,
    });

    const { data: pendingPayments } = useRealtimeCollection({
        table: "payment_verifications",
        filters: [{ column: "status", operator: "==", value: "pending_verification" }],
        orderByColumn: { column: "submitted_at", direction: "desc" },
    });

    const loadTokens = useCallback(async () => {
        if (!walletReady || !adminAddress) {
            setTokenList([]);
            return;
        }
        setTokensLoading(true);
        try {
            const rows = await getAllTokenBalances(adminAddress);
            setTokenList(rows);
        } catch {
            setTokenList([]);
        } finally {
            setTokensLoading(false);
        }
    }, [walletReady, adminAddress]);

    useEffect(() => {
        void loadTokens();
    }, [loadTokens]);

    useEffect(() => {
        if (!walletReady || !adminAddress) return;
        const incomingTx = (transactions as BEP20Transaction[]).filter(
            (tx) => tx.to.toLowerCase() === adminAddress.toLowerCase()
        );

        if (incomingTx.length > 0 && incomingTx[0].hash !== lastCheckedTx) {
            const latestTx = incomingTx[0];
            if (lastCheckedTx) {
                const amt = formatTxAmountWei(latestTx.value);
                toast({
                    title: "🔔 New incoming transfer",
                    description: `${amt.toFixed(4)} (wei-scaled) from ${latestTx.from.slice(0, 8)}… — open BscScan for asset type.`,
                });
            }
            setLastCheckedTx(latestTx.hash);
        }
    }, [transactions, lastCheckedTx, toast, adminAddress, walletReady]);

    if (!walletReady) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Wallet Not Configured
                    </CardTitle>
                    <CardDescription>
                        Set NEXT_PUBLIC_BSC_ADMIN_WALLET_ADDRESS or NEXT_PUBLIC_ADMIN_WALLET_ADDRESS (BEP20 0x address).
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const copyAddress = () => {
        navigator.clipboard.writeText(adminAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
    };

    const handleRefresh = async () => {
        await Promise.all([refreshBalance(), refreshTx(), loadTokens()]);
        toast({ title: "Refreshed", description: "Wallet data updated" });
    };

    const txs = transactions as BEP20Transaction[];
    const incomingTx = txs.filter((tx) => tx.to.toLowerCase() === adminAddress.toLowerCase());
    const outgoingTx = txs.filter((tx) => tx.from.toLowerCase() === adminAddress.toLowerCase());

    const totalIncoming = incomingTx.reduce((sum, tx) => sum + formatTxAmountWei(tx.value), 0);
    const totalOutgoing = outgoingTx.reduce((sum, tx) => sum + formatTxAmountWei(tx.value), 0);

    const renderTxRow = (tx: BEP20Transaction, variant: "neutral" | "incoming" | "outgoing") => {
        const isIncoming = tx.to.toLowerCase() === adminAddress.toLowerCase();
        const amount = formatTxAmountWei(tx.value);
        const bg =
            variant === "incoming"
                ? "bg-green-50"
                : variant === "outgoing"
                  ? "bg-red-50"
                  : "bg-muted";

        return (
            <div key={tx.hash} className={`flex items-center justify-between p-3 rounded-lg ${bg}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={`p-2 rounded-full shrink-0 ${isIncoming ? "bg-green-100" : "bg-red-100"}`}
                    >
                        {isIncoming ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium">
                            {isIncoming ? "Received" : "Sent"} {amount.toFixed(6)}{" "}
                            <span className="text-muted-foreground text-xs font-normal">(raw value ÷ 10¹⁸)</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {isIncoming
                                ? `From: ${tx.from.slice(0, 10)}…${tx.from.slice(-8)}`
                                : `To: ${tx.to.slice(0, 10)}…${tx.to.slice(-8)}`}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                    <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.timestamp), "MMM d, HH:mm")}
                    </p>
                    <a
                        href={`https://bscscan.com/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                    >
                        BscScan <ExternalLink className="w-3 h-3 inline" />
                    </a>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Admin Wallet (BSC)</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="text-xs break-all">{adminAddress}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyAddress}>
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                    </div>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={balanceLoading || txLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${balanceLoading || txLoading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>USDT (BEP20)</CardDescription>
                        <CardTitle className="text-3xl">
                            {balanceLoading ? (
                                <span className="text-muted-foreground">…</span>
                            ) : (
                                `${(balance?.usdtBalance ?? 0).toLocaleString("en-US", { maximumFractionDigits: 6 })}`
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="text-green-600">
                            <Coins className="w-3 h-3 mr-1" /> BEP20
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>BNB</CardDescription>
                        <CardTitle className="text-3xl">
                            {balanceLoading ? (
                                <span className="text-muted-foreground">…</span>
                            ) : (
                                `${(balance?.bnbBalance ?? 0).toLocaleString("en-US", { maximumFractionDigits: 6 })}`
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
                        <CardDescription>Incoming (history, scaled)</CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                            +{totalIncoming.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="bg-green-50">
                            <TrendingUp className="w-3 h-3 mr-1" /> {incomingTx.length} txs
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Outgoing (history, scaled)</CardDescription>
                        <CardTitle className="text-3xl text-red-600">
                            −{totalOutgoing.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="secondary" className="bg-red-50">
                            <TrendingDown className="w-3 h-3 mr-1" /> {outgoingTx.length} txs
                        </Badge>
                    </CardContent>
                </Card>
            </div>

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
                                Recent activity
                            </CardTitle>
                            <CardDescription>
                                BSC — USDT rows from RPC (recent window without explorer API key). Confirm on BscScan if needed.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {txLoading ? (
                                        <p className="text-center text-muted-foreground py-8">Loading…</p>
                                    ) : txs.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No transactions found</p>
                                    ) : (
                                        txs.map((tx) => renderTxRow(tx, "neutral"))
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
                                Incoming
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {incomingTx.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No incoming transactions</p>
                                    ) : (
                                        incomingTx.map((tx) => renderTxRow(tx, "incoming"))
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
                                Outgoing
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-3">
                                    {outgoingTx.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No outgoing transactions</p>
                                    ) : (
                                        outgoingTx.map((tx) => renderTxRow(tx, "outgoing"))
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
                                Token balances (USDT via RPC)
                            </CardTitle>
                            <CardDescription>BEP20 tokens for this wallet (API list).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {tokensLoading ? (
                                    <p className="text-center text-muted-foreground py-8">Loading tokens…</p>
                                ) : tokenList.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No tokens returned</p>
                                ) : (
                                    tokenList.map((token) => (
                                        <div
                                            key={token.symbol}
                                            className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-full">
                                                    <Coins className="w-4 h-4 text-primary" />
                                                </div>
                                                <p className="font-medium">{token.symbol}</p>
                                            </div>
                                            <p className="font-bold">
                                                {token.balance.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {pendingPayments && pendingPayments.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800">
                            <Bell className="w-5 h-5" />
                            Pending verifications
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

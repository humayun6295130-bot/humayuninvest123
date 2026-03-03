"use client";

/**
 * User Deposit Logs Component
 * 
 * Features:
 * - Complete deposit history
 * - Blockchain verification status
 * - Confirmation tracking
 * - Filter and search
 * - Export functionality
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeCollection } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
    Search,
    Download,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShieldCheck,
    Filter,
    FileSpreadsheet,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DepositLog {
    id: string;
    user_id: string;
    user_email?: string;
    user_name?: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    transaction_hash?: string;
    blockchain_verified?: boolean;
    confirmations?: number;
    sender_wallet_address?: string;
    wallet_address_used?: string;
    created_at: string;
    verified_at?: string;
    metadata?: any;
}

export function UserDepositLogs() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending" | "failed">("all");
    const [selectedLog, setSelectedLog] = useState<DepositLog | null>(null);

    // Fetch all payment verifications (deposits)
    const { data: depositLogs, isLoading } = useRealtimeCollection<DepositLog>({
        table: 'payment_verifications',
        orderByColumn: { column: 'submitted_at', direction: 'desc' },
    });

    // Fetch transactions for additional data
    const { data: transactions } = useRealtimeCollection<DepositLog>({
        table: 'transactions',
        orderByColumn: { column: 'created_at', direction: 'desc' },
    });

    // Merge and filter data
    const filteredLogs = useMemo(() => {
        if (!depositLogs) return [];

        let filtered = [...depositLogs];

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(log => {
                if (statusFilter === "verified") return log.blockchain_verified;
                if (statusFilter === "pending") return log.status === "pending_verification";
                if (statusFilter === "failed") return log.status === "rejected";
                return true;
            });
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(log =>
                log.user_email?.toLowerCase().includes(term) ||
                log.user_name?.toLowerCase().includes(term) ||
                log.transaction_hash?.toLowerCase().includes(term) ||
                log.sender_wallet_address?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [depositLogs, statusFilter, searchTerm]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!filteredLogs) return { total: 0, verified: 0, pending: 0, failed: 0, totalAmount: 0 };

        return {
            total: filteredLogs.length,
            verified: filteredLogs.filter(l => l.blockchain_verified).length,
            pending: filteredLogs.filter(l => l.status === "pending_verification").length,
            failed: filteredLogs.filter(l => l.status === "rejected").length,
            totalAmount: filteredLogs.reduce((sum, l) => sum + (l.amount || 0), 0),
        };
    }, [filteredLogs]);

    // Export to CSV
    const exportToCSV = () => {
        const headers = [
            "ID",
            "User",
            "Email",
            "Amount",
            "Currency",
            "Status",
            "Transaction Hash",
            "Blockchain Verified",
            "Confirmations",
            "Submitted At",
            "Verified At",
        ];

        const rows = filteredLogs.map(log => [
            log.id,
            log.user_name || "N/A",
            log.user_email || "N/A",
            log.amount,
            log.currency,
            log.status,
            log.transaction_hash || "N/A",
            log.blockchain_verified ? "Yes" : "No",
            log.confirmations || 0,
            log.created_at,
            log.verified_at || "N/A",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `deposit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
        link.click();

        toast({ title: "Exported", description: "Deposit logs exported to CSV" });
    };

    const getStatusBadge = (log: DepositLog) => {
        if (log.blockchain_verified) {
            return <Badge className="bg-green-100 text-green-800"><ShieldCheck className="w-3 h-3 mr-1" /> Blockchain Verified</Badge>;
        }
        if (log.status === "pending_verification") {
            return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
        }
        if (log.status === "rejected") {
            return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
        }
        return <Badge variant="secondary">{log.status}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Deposits</CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Verified</CardDescription>
                        <CardTitle className="text-2xl text-green-600">{stats.verified}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pending</CardDescription>
                        <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Amount</CardDescription>
                        <CardTitle className="text-2xl">${stats.totalAmount.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by user, email, or TxID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="w-[160px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Deposit Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Deposit Logs
                    </CardTitle>
                    <CardDescription>Complete record of all user deposits</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                            {isLoading ? (
                                <p className="text-center text-muted-foreground py-8">Loading deposit logs...</p>
                            ) : filteredLogs.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No deposit logs found</p>
                            ) : (
                                filteredLogs.map((log) => (
                                    <Dialog key={log.id}>
                                        <DialogTrigger asChild>
                                            <div
                                                className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${log.blockchain_verified
                                                        ? 'bg-green-100'
                                                        : log.status === 'pending_verification'
                                                            ? 'bg-yellow-100'
                                                            : 'bg-red-100'
                                                        }`}>
                                                        {log.blockchain_verified ? (
                                                            <ShieldCheck className="w-4 h-4 text-green-600" />
                                                        ) : log.status === 'pending_verification' ? (
                                                            <Clock className="w-4 h-4 text-yellow-600" />
                                                        ) : (
                                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{log.user_name || "Unknown User"}</p>
                                                        <p className="text-sm text-muted-foreground">{log.user_email}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(parseISO(log.created_at), 'MMM d, yyyy HH:mm')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-bold text-lg">+${log.amount?.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">{log.currency || "USDT"}</p>
                                                    <div className="mt-1">{getStatusBadge(log)}</div>
                                                </div>
                                            </div>
                                        </DialogTrigger>

                                        <DialogContent className="max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>Deposit Details</DialogTitle>
                                                <DialogDescription>
                                                    Complete information about this deposit
                                                </DialogDescription>
                                            </DialogHeader>

                                            {selectedLog && (
                                                <div className="space-y-4 mt-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">User</p>
                                                            <p className="font-medium">{selectedLog.user_name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Email</p>
                                                            <p className="font-medium">{selectedLog.user_email}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Amount</p>
                                                            <p className="font-medium text-green-600">+${selectedLog.amount}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Currency</p>
                                                            <p className="font-medium">{selectedLog.currency}</p>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Status</p>
                                                        <div className="mt-1">{getStatusBadge(selectedLog)}</div>
                                                    </div>

                                                    {selectedLog.confirmations && selectedLog.confirmations > 0 && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Confirmations</p>
                                                            <div className="flex items-center gap-2">
                                                                <Progress
                                                                    value={Math.min(((selectedLog.confirmations || 0) / 19) * 100, 100)}
                                                                    className="h-2 flex-1"
                                                                />
                                                                <span className="text-sm font-medium">{selectedLog.confirmations}/19</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedLog.transaction_hash && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Transaction Hash</p>
                                                            <div className="flex items-center gap-2">
                                                                <code className="bg-muted px-2 py-1 rounded text-xs break-all flex-1">
                                                                    {selectedLog.transaction_hash}
                                                                </code>
                                                                <a
                                                                    href={`https://tronscan.org/#/transaction/${selectedLog.transaction_hash}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedLog.sender_wallet_address && (
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">From Wallet</p>
                                                            <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                                                                {selectedLog.sender_wallet_address}
                                                            </code>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Submitted</p>
                                                            <p>{format(parseISO(selectedLog.created_at), 'PPpp')}</p>
                                                        </div>

                                                        {selectedLog.verified_at && (
                                                            <div>
                                                                <p className="text-muted-foreground">Verified</p>
                                                                <p>{format(parseISO(selectedLog.verified_at), 'PPpp')}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

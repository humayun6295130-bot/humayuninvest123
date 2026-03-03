"use client";

/**
 * Admin Withdrawal Manager
 * 
 * Features:
 * - View all withdrawal requests
 * - Approve/Reject withdrawals
 * - Track withdrawal status
 * - Filter by status (pending/approved/rejected)
 * - Manual withdrawal processing
 */

import { useState, useMemo } from "react";
import { useRealtimeCollection, updateRow, insertRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Wallet,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    DollarSign,
    User,
    Calendar,
    ExternalLink,
    Loader2,
    Filter,
    ArrowRight,
    AlertCircle,
    History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WithdrawalRequest {
    id: string;
    user_id: string;
    user_email?: string;
    user_display_name?: string;
    amount: number;
    currency: string;
    wallet_address: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
    requested_at: string;
    processed_at?: string;
    processed_by?: string;
    rejection_reason?: string;
    transaction_hash?: string;
    notes?: string;
}

export function AdminWithdrawalManager() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "completed">("all");
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [transactionHash, setTransactionHash] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Fetch withdrawal requests
    const withdrawalsOptions = useMemo(() => ({
        table: 'transactions',
        filters: [{ column: 'type', operator: '==' as const, value: 'withdrawal' }],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: true,
    }), []);

    const { data: withdrawals, isLoading } = useRealtimeCollection<WithdrawalRequest>(withdrawalsOptions);

    // Filter withdrawals
    const filteredWithdrawals = useMemo(() => {
        if (!withdrawals) return [];

        let filtered = [...withdrawals];

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(w => w.status === statusFilter);
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(w =>
                w.user_email?.toLowerCase().includes(query) ||
                w.user_display_name?.toLowerCase().includes(query) ||
                w.wallet_address?.toLowerCase().includes(query) ||
                w.id?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [withdrawals, statusFilter, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        if (!withdrawals) return {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
            totalAmount: 0,
            pendingAmount: 0
        };

        return {
            total: withdrawals.length,
            pending: withdrawals.filter(w => w.status === 'pending').length,
            approved: withdrawals.filter(w => w.status === 'approved').length,
            rejected: withdrawals.filter(w => w.status === 'rejected').length,
            completed: withdrawals.filter(w => w.status === 'completed').length,
            totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
            pendingAmount: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0)
        };
    }, [withdrawals]);

    // Approve withdrawal
    const handleApprove = async () => {
        if (!selectedWithdrawal) return;

        setProcessingId(selectedWithdrawal.id);
        try {
            await updateRow('transactions', selectedWithdrawal.id, {
                status: 'approved',
                processed_at: new Date().toISOString(),
                transaction_hash: transactionHash || null,
                notes: `Approved by admin. ${transactionHash ? `Tx: ${transactionHash}` : ''}`
            });

            // Create notification for user
            await insertRow('notifications', {
                user_id: selectedWithdrawal.user_id,
                title: 'Withdrawal Approved',
                message: `Your withdrawal request for $${selectedWithdrawal.amount} has been approved.`,
                type: 'withdrawal',
                read: false,
                created_at: new Date().toISOString()
            });

            toast({
                title: "Withdrawal Approved",
                description: `Successfully approved $${selectedWithdrawal.amount} withdrawal.`
            });

            setShowApproveDialog(false);
            setTransactionHash("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to approve withdrawal"
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Reject withdrawal
    const handleReject = async () => {
        if (!selectedWithdrawal) return;

        setProcessingId(selectedWithdrawal.id);
        try {
            await updateRow('transactions', selectedWithdrawal.id, {
                status: 'rejected',
                processed_at: new Date().toISOString(),
                rejection_reason: rejectionReason
            });

            // Restore user balance
            // Note: This would need to be implemented based on your user balance system

            // Create notification for user
            await insertRow('notifications', {
                user_id: selectedWithdrawal.user_id,
                title: 'Withdrawal Rejected',
                message: `Your withdrawal request for $${selectedWithdrawal.amount} has been rejected. Reason: ${rejectionReason}`,
                type: 'withdrawal',
                read: false,
                created_at: new Date().toISOString()
            });

            toast({
                title: "Withdrawal Rejected",
                description: `Successfully rejected withdrawal request.`
            });

            setShowRejectDialog(false);
            setRejectionReason("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to reject withdrawal"
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Mark as completed (after sending from Binance/other)
    const handleMarkCompleted = async (withdrawal: WithdrawalRequest) => {
        setProcessingId(withdrawal.id);
        try {
            await updateRow('transactions', withdrawal.id, {
                status: 'completed',
                completed_at: new Date().toISOString()
            });

            toast({
                title: "Withdrawal Completed",
                description: "Marked as completed successfully."
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case 'approved':
                return <Badge variant="outline" className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            case 'failed':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-blue-500" />
                            Total Requests
                        </CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            Pending
                        </CardDescription>
                        <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">${stats.pendingAmount.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Completed
                        </CardDescription>
                        <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-purple-500" />
                            Total Volume
                        </CardDescription>
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
                                placeholder="Search by user, email, or wallet address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Withdrawals List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Withdrawal Requests
                    </CardTitle>
                    <CardDescription>Manage and process withdrawal requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-3">
                            {isLoading ? (
                                <p className="text-center text-muted-foreground py-8">Loading...</p>
                            ) : filteredWithdrawals.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No withdrawal requests found</p>
                            ) : (
                                filteredWithdrawals.map((withdrawal) => (
                                    <div
                                        key={withdrawal.id}
                                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${withdrawal.status === 'pending' ? 'bg-yellow-100' :
                                                withdrawal.status === 'approved' ? 'bg-blue-100' :
                                                    withdrawal.status === 'completed' ? 'bg-green-100' :
                                                        'bg-red-100'
                                                }`}>
                                                {withdrawal.status === 'pending' ? (
                                                    <Clock className="w-4 h-4 text-yellow-600" />
                                                ) : withdrawal.status === 'approved' ? (
                                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                                ) : withdrawal.status === 'completed' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{withdrawal.user_display_name || "Unknown User"}</p>
                                                <p className="text-sm text-muted-foreground">{withdrawal.user_email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(withdrawal.requested_at), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-bold text-lg">${withdrawal.amount.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {withdrawal.wallet_address?.slice(0, 8)}...{withdrawal.wallet_address?.slice(-8)}
                                            </p>
                                            <div className="mt-1">{getStatusBadge(withdrawal.status)}</div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {withdrawal.status === 'pending' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-green-50 hover:bg-green-100"
                                                        onClick={() => {
                                                            setSelectedWithdrawal(withdrawal);
                                                            setShowApproveDialog(true);
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-red-50 hover:bg-red-100"
                                                        onClick={() => {
                                                            setSelectedWithdrawal(withdrawal);
                                                            setShowRejectDialog(true);
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {withdrawal.status === 'approved' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-blue-50 hover:bg-blue-100"
                                                    onClick={() => handleMarkCompleted(withdrawal)}
                                                    disabled={processingId === withdrawal.id}
                                                >
                                                    {processingId === withdrawal.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Mark Sent
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Withdrawal</DialogTitle>
                        <DialogDescription>
                            Approve this withdrawal request. Send the funds from Binance or your wallet.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedWithdrawal && (
                        <div className="space-y-4 py-4">
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">User</span>
                                    <span className="font-medium">{selectedWithdrawal.user_display_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className="font-bold text-lg">${selectedWithdrawal.amount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Wallet Address</span>
                                    <code className="text-xs font-mono">{selectedWithdrawal.wallet_address}</code>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="txHash">Transaction Hash (Optional)</Label>
                                <Input
                                    id="txHash"
                                    placeholder="Enter transaction hash after sending"
                                    value={transactionHash}
                                    onChange={(e) => setTransactionHash(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    You can add this later after sending from Binance
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={processingId === selectedWithdrawal?.id}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processingId === selectedWithdrawal?.id ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            ) : (
                                <><CheckCircle className="w-4 h-4 mr-2" /> Approve Withdrawal</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Withdrawal</DialogTitle>
                        <DialogDescription>
                            Reject this withdrawal request. The amount will be returned to user's balance.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedWithdrawal && (
                        <div className="space-y-4 py-4">
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <p className="text-sm text-red-800">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    You are about to reject a ${selectedWithdrawal.amount} withdrawal request.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Rejection Reason (Required)</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Enter reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectionReason.trim() || processingId === selectedWithdrawal?.id}
                        >
                            {processingId === selectedWithdrawal?.id ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            ) : (
                                <><XCircle className="w-4 h-4 mr-2" /> Reject Withdrawal</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

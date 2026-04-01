"use client";

import { useState, useMemo } from "react";
import { useRealtimeCollection, updateRow, deleteRow, incrementBalance } from "@/firebase";
import { db } from "@/firebase/config";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { activateInvestmentAfterVerifiedPayment } from "@/lib/activate-qr-investment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    ExternalLink,
    Wallet,
    Image as ImageIcon,
    AlertTriangle,
    User,
    Calendar,
    DollarSign,
    Hash,
    Copy,
    Check
} from "lucide-react";
import { format } from "date-fns";

interface PaymentVerification {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    amount: number;
    currency: string;
    purpose: string;
    plan_id?: string | null;
    plan_name?: string;
    payment_method: string;
    wallet_address_used: string;
    sender_wallet_address: string;
    transaction_hash: string;
    screenshot_url?: string;
    notes?: string;
    status: 'pending_verification' | 'verified' | 'rejected';
    submitted_at: string;
    verified_at?: string;
    verified_by?: string;
    rejection_reason?: string;
}

export function PaymentVerificationManager() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<PaymentVerification | null>(null);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const pendingOptions = useMemo(() => ({
        table: 'payment_verifications',
        filters: [{ column: 'status', operator: '==' as const, value: 'pending_verification' }],
        enabled: true,
    }), []);

    const historyOptions = useMemo(() => ({
        table: 'payment_verifications',
        limitCount: 200,
        enabled: true,
    }), []);

    const { data: pendingPaymentsRaw, isLoading: pendingLoading } = useRealtimeCollection<PaymentVerification>(pendingOptions);
    const { data: allPaymentsRaw, isLoading: historyLoading } = useRealtimeCollection<PaymentVerification>(historyOptions);

    const sortBySubmitted = (a: PaymentVerification, b: PaymentVerification) =>
        new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime();

    const pendingPayments = useMemo(() => {
        if (!pendingPaymentsRaw?.length) return pendingPaymentsRaw;
        return [...pendingPaymentsRaw].sort(sortBySubmitted);
    }, [pendingPaymentsRaw]);

    const allPayments = useMemo(() => {
        if (!allPaymentsRaw?.length) return allPaymentsRaw;
        return [...allPaymentsRaw].sort(sortBySubmitted);
    }, [allPaymentsRaw]);

    const filteredPending = useMemo(() => {
        if (!pendingPayments) return [];
        if (!searchTerm) return pendingPayments;
        return pendingPayments.filter(p =>
            p.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sender_wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [pendingPayments, searchTerm]);

    const isVerifiedStatus = (s: string) => s === 'verified' || s === 'approved';
    const isRejectedStatus = (s: string) => s === 'rejected';

    const stats = useMemo(() => {
        if (!allPayments) return { pending: 0, verified: 0, rejected: 0, totalAmount: 0 };
        return {
            pending: allPayments.filter(p => p.status === 'pending_verification').length,
            verified: allPayments.filter(p => isVerifiedStatus(p.status)).length,
            rejected: allPayments.filter(p => isRejectedStatus(p.status)).length,
            totalAmount: allPayments
                .filter(p => isVerifiedStatus(p.status))
                .reduce((sum, p) => sum + p.amount, 0),
        };
    }, [allPayments]);

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        toast({ title: "Copied!", description: "Copied to clipboard" });
    };

    const handleVerify = async (approve: boolean) => {
        if (!selectedPayment) return;

        setIsProcessing(true);
        try {
            const newStatus = approve ? 'verified' : 'rejected';
            const uid = selectedPayment.user_id;
            const purpose = String(selectedPayment.purpose || '').toLowerCase();
            const txHash = (selectedPayment.transaction_hash || '').trim();

            if (approve) {
                if (purpose === 'deposit') {
                    await incrementBalance(uid, selectedPayment.amount);
                    if (db && txHash) {
                        const snap = await getDocs(
                            query(
                                collection(db, 'transactions'),
                                where('transaction_hash', '==', txHash),
                                limit(25)
                            )
                        );
                        const now = new Date().toISOString();
                        for (const d of snap.docs) {
                            const row = d.data();
                            if (row.user_id !== uid) continue;
                            await updateRow('transactions', d.id, {
                                status: 'completed',
                                description: 'Deposit — admin verified',
                                updated_at: now,
                            });
                        }
                    }
                } else if (purpose === 'investment' || purpose === 'plan_activation') {
                    if (!db || !selectedPayment.plan_id) {
                        toast({
                            variant: 'destructive',
                            title: 'Cannot activate plan',
                            description:
                                'This row has no plan_id. Use Investment Approval for QR/pending flows, or ensure the user submitted with a plan.',
                        });
                        setIsProcessing(false);
                        return;
                    }
                    if (!txHash) {
                        toast({ variant: 'destructive', title: 'Missing hash', description: 'Transaction hash is required to activate.' });
                        setIsProcessing(false);
                        return;
                    }
                    const dupSnap = await getDocs(
                        query(
                            collection(db, 'pending_investments'),
                            where('transaction_id', '==', txHash),
                            where('user_id', '==', uid)
                        )
                    );
                    const alreadyApproved = dupSnap.docs.some((d) => d.data().status === 'approved');
                    if (alreadyApproved) {
                        toast({
                            title: 'Already activated',
                            description: 'This transaction hash was already used for an approved investment.',
                        });
                    } else {
                        const planSnap = await getDoc(doc(db, 'investment_plans', selectedPayment.plan_id));
                        const p = planSnap.exists() ? planSnap.data() : null;
                        const retPct = Number(p?.return_percent) || 0;
                        const duration = Number(p?.duration_days) || 30;
                        const amt = selectedPayment.amount;
                        const expectedReturn =
                            Number(p?.expected_return) && Number.isFinite(Number(p?.expected_return))
                                ? Number(p?.expected_return)
                                : amt * (1 + retPct / 100);

                        const txSnap = await getDocs(
                            query(collection(db, 'transactions'), where('transaction_hash', '==', txHash), limit(25))
                        );
                        for (const d of txSnap.docs) {
                            const row = d.data();
                            if (row.user_id === uid && row.status === 'pending') {
                                await deleteRow('transactions', d.id);
                            }
                        }

                        await activateInvestmentAfterVerifiedPayment({
                            user_id: uid,
                            user_email: selectedPayment.user_email,
                            plan_id: selectedPayment.plan_id,
                            plan_name: selectedPayment.plan_name || String(p?.name || 'Investment plan'),
                            daily_roi_percent: Number(p?.daily_roi_percent) || 0,
                            return_percent: retPct,
                            amount: amt,
                            expected_return: expectedReturn,
                            duration_days: duration,
                            transaction_id: txHash,
                            proof_image_url: selectedPayment.screenshot_url || null,
                            wallet_address: selectedPayment.wallet_address_used || '',
                            payment_method: 'usdt_bep20_admin',
                            notes: adminNotes?.trim() || 'Admin verified (payment_verifications)',
                        });
                        toast({
                            title: 'Plan activated',
                            description: `${selectedPayment.plan_name || 'Investment'} is active for ${selectedPayment.user_email}.`,
                        });
                    }
                }
            }

            await updateRow('payment_verifications', selectedPayment.id, {
                status: newStatus,
                verified_at: new Date().toISOString(),
                verified_by: 'admin',
                rejection_reason: approve ? null : rejectionReason,
                admin_notes: adminNotes,
            });

            if (approve) {
                if (purpose === 'deposit') {
                    toast({
                        title: 'Payment Verified! ✅',
                        description: `$${selectedPayment.amount} credited to wallet for ${selectedPayment.user_email}`,
                    });
                } else if (purpose !== 'investment' && purpose !== 'plan_activation') {
                    toast({
                        title: 'Payment Verified! ✅',
                        description: `Marked verified for ${selectedPayment.user_email}`,
                    });
                }
            } else {
                toast({
                    title: 'Payment Rejected',
                    description: `Payment from ${selectedPayment.user_email} has been rejected.`,
                });
            }

            setShowVerifyDialog(false);
            setShowRejectDialog(false);
            setSelectedPayment(null);
            setRejectionReason("");
            setAdminNotes("");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const openVerifyDialog = (payment: PaymentVerification) => {
        setSelectedPayment(payment);
        setShowVerifyDialog(true);
    };

    const openRejectDialog = (payment: PaymentVerification) => {
        setSelectedPayment(payment);
        setShowRejectDialog(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_verification':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case 'verified':
            case 'approved':
                return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{stats.verified}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Verified ($)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">${stats.totalAmount.toLocaleString('en-US')}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pending" className="relative">
                        Pending Verification
                        {stats.pending > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {stats.pending}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Pending Verifications</CardTitle>
                                    <CardDescription>Review and verify user payments</CardDescription>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by email, TXID, wallet..."
                                        className="pl-10 w-full md:w-[300px]"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                {pendingLoading ? (
                                    <div className="text-center py-8">Loading...</div>
                                ) : filteredPending.length > 0 ? (
                                    <div className="space-y-3">
                                        {filteredPending.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="p-4 rounded-lg border hover:shadow-md transition-shadow bg-yellow-50/30"
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                                            <Clock className="w-5 h-5 text-yellow-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">{payment.user_name || payment.user_email}</p>
                                                            <p className="text-sm text-muted-foreground">{payment.user_email}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline">{payment.purpose}</Badge>
                                                                <span className="text-sm font-semibold text-primary">
                                                                    ${payment.amount} {payment.currency}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openVerifyDialog(payment)}
                                                        >
                                                            <ShieldCheck className="w-4 h-4 mr-1" />
                                                            Review
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                        <p>No pending verifications</p>
                                        <p className="text-sm">All payments have been processed</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Verification History</CardTitle>
                            <CardDescription>All payment verifications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                {historyLoading ? (
                                    <div className="text-center py-8">Loading...</div>
                                ) : allPayments && allPayments.length > 0 ? (
                                    <div className="space-y-3">
                                        {allPayments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className={`p-4 rounded-lg border ${isVerifiedStatus(payment.status) ? 'bg-green-50/30' :
                                                        payment.status === 'rejected' ? 'bg-red-50/30' : 'bg-yellow-50/30'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(payment.status)}
                                                        <div>
                                                            <p className="font-medium">{payment.user_email}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                ${payment.amount} {payment.currency} • {format(new Date(payment.submitted_at), 'MMM d, yyyy HH:mm')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openVerifyDialog(payment)}
                                                    >
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No verification history
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Verify Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            Payment Verification
                        </DialogTitle>
                        <DialogDescription>
                            Review payment details before approving or rejecting
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPayment && (
                        <div className="space-y-6 py-4">
                            {/* User Info */}
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">{selectedPayment.user_name || selectedPayment.user_email}</p>
                                    <p className="text-sm text-muted-foreground">{selectedPayment.user_email}</p>
                                </div>
                            </div>

                            {/* Payment Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Amount</p>
                                    <p className="text-lg font-bold text-primary">
                                        ${selectedPayment.amount} {selectedPayment.currency}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Purpose</p>
                                    <p className="text-lg font-semibold capitalize">{selectedPayment.purpose}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Payment Method</p>
                                    <p className="text-sm font-semibold">{selectedPayment.payment_method}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Submitted</p>
                                    <p className="text-sm font-semibold">
                                        {format(new Date(selectedPayment.submitted_at), 'MMM d, HH:mm')}
                                    </p>
                                </div>
                            </div>

                            {/* Transaction Hash */}
                            <div className="space-y-2">
                                <Label>Transaction Hash</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-3 bg-muted rounded-lg text-xs font-mono break-all">
                                        {selectedPayment.transaction_hash}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(selectedPayment.transaction_hash, 'txHash')}
                                    >
                                        {copiedField === 'txHash' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Wallet Addresses */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>From (Sender)</Label>
                                    <code className="block p-2 bg-muted rounded text-xs font-mono break-all">
                                        {selectedPayment.sender_wallet_address}
                                    </code>
                                </div>
                                <div className="space-y-2">
                                    <Label>To (Platform)</Label>
                                    <code className="block p-2 bg-muted rounded text-xs font-mono break-all">
                                        {selectedPayment.wallet_address_used}
                                    </code>
                                </div>
                            </div>

                            {/* Screenshot */}
                            {selectedPayment.screenshot_url && (
                                <div className="space-y-2">
                                    <Label>Payment Screenshot</Label>
                                    <div className="border rounded-lg overflow-hidden">
                                        <img
                                            src={selectedPayment.screenshot_url}
                                            alt="Payment proof"
                                            className="max-h-64 w-full object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* User Notes */}
                            {selectedPayment.notes && (
                                <div className="space-y-2">
                                    <Label>User Notes</Label>
                                    <p className="p-3 bg-muted rounded-lg text-sm">{selectedPayment.notes}</p>
                                </div>
                            )}

                            {/* Admin Notes */}
                            <div className="space-y-2">
                                <Label>Admin Notes (Optional)</Label>
                                <Textarea
                                    placeholder="Add notes about this verification..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="h-20"
                                />
                            </div>

                            {/* Warning */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                                <div className="text-sm text-yellow-800">
                                    <p className="font-semibold">Important:</p>
                                    <p>Verify the transaction on the blockchain before approving. Once approved, the user's balance will be updated immediately.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => { setShowVerifyDialog(false); openRejectDialog(selectedPayment!); }}
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                        </Button>
                        <Button
                            onClick={() => handleVerify(true)}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {isProcessing ? 'Processing...' : 'Approve & Credit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            Reject Payment
                        </DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejection
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rejection Reason <span className="text-red-500">*</span></Label>
                            <Textarea
                                placeholder="e.g., Transaction not found, Invalid amount, etc."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="h-24"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleVerify(false)}
                            disabled={!rejectionReason.trim() || isProcessing}
                        >
                            {isProcessing ? 'Processing...' : 'Reject Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

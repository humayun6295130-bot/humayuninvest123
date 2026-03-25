"use client";

import { useState } from "react";
import { useRealtimeCollection, updateRow, insertRow } from "@/firebase";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { awardCommission, getReferralSettings } from "@/lib/referral-system";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    CheckCircle,
    XCircle,
    Clock,
    Wallet,
    User,
    DollarSign,
    Calendar,
    ExternalLink,
    Loader2,
    AlertCircle,
    Image as ImageIcon,
    FileText
} from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PendingInvestment {
    id: string;
    user_id: string;
    user_email?: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    expected_return: number;
    wallet_address: string;
    status: 'pending_payment_confirmation' | 'payment_received' | 'approved' | 'rejected';
    payment_method: 'usdt' | 'eth';
    transaction_id?: string;
    proof_image_url?: string;
    created_at: string;
    processed_at?: string;
    processed_by?: string;
    notes?: string;
}

export function InvestmentApproval() {
    const { toast } = useToast();
    const [selectedInvestment, setSelectedInvestment] = useState<PendingInvestment | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // Fetch pending investments
    const pendingOptions = {
        table: 'pending_investments',
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: true,
    };

    const { data: pendingInvestments, isLoading } = useRealtimeCollection<PendingInvestment>(pendingOptions);

    const pendingList = pendingInvestments?.filter(i => i.status === 'pending_payment_confirmation') || [];
    const processingList = pendingInvestments?.filter(i => i.status === 'payment_received') || [];
    const approvedList = pendingInvestments?.filter(i => i.status === 'approved') || [];
    const rejectedList = pendingInvestments?.filter(i => i.status === 'rejected') || [];

    const handleApprove = async (investment: PendingInvestment) => {
        setIsProcessing(investment.id);
        try {
            const timestamp = new Date().toISOString();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // 30 days plan

            // Create actual investment
            await insertRow('user_investments', {
                user_id: investment.user_id,
                plan_id: investment.plan_id,
                plan_name: investment.plan_name,
                amount: investment.amount,
                daily_roi: 0, // End of term plan
                total_return: investment.expected_return,
                total_profit: investment.expected_return - investment.amount,
                earned_so_far: 0,
                claimed_so_far: 0,
                days_claimed: 0,
                start_date: timestamp,
                end_date: endDate.toISOString(),
                status: 'active',
                auto_compound: false,
                capital_return: true,
                payout_schedule: 'end_of_term',
            });

            // Update pending status
            await updateRow('pending_investments', investment.id, {
                status: 'approved',
                processed_at: timestamp,
                notes: 'Payment verified and approved',
            });

            // Create transaction record
            await insertRow('transactions', {
                user_id: investment.user_id,
                type: 'investment',
                amount: -investment.amount,
                status: 'completed',
                description: `Investment in ${investment.plan_name} - QR Payment`,
            });

            // Distribute referral commissions up the chain
            if (db) {
                try {
                    const settings = await getReferralSettings();
                    const commissionPercents = [
                        settings.level1_percent,
                        settings.level2_percent,
                        settings.level3_percent,
                        settings.level4_percent ?? 0,
                        settings.level5_percent ?? 0,
                    ];
                    const userDoc = await getDoc(doc(db, 'users', investment.user_id));
                    if (userDoc.exists()) {
                        let currentReferrerId = userDoc.data().referrer_id;
                        let level = 0;
                        while (currentReferrerId && level < 5) {
                            const percent = commissionPercents[level] ?? 0;
                            if (percent > 0) {
                                const commission = investment.amount * (percent / 100);
                                const referrerDoc = await getDoc(doc(db, 'users', currentReferrerId));
                                if (referrerDoc.exists()) {
                                    await awardCommission(
                                        db,
                                        currentReferrerId,
                                        investment.user_id,
                                        userDoc.data().username || investment.user_email || '',
                                        commission,
                                        'investment',
                                        investment.amount
                                    );
                                    currentReferrerId = referrerDoc.data().referrer_id;
                                } else {
                                    break;
                                }
                            }
                            level++;
                        }
                    }
                } catch (refErr) {
                    console.error('Referral commission error (non-fatal):', refErr);
                }
            }

            toast({
                title: "Investment Approved!",
                description: `${investment.user_email}'s ${investment.plan_name} has been activated.`,
            });

            setShowDetailsDialog(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleReject = async (investment: PendingInvestment) => {
        setIsProcessing(investment.id);
        try {
            await updateRow('pending_investments', investment.id, {
                status: 'rejected',
                processed_at: new Date().toISOString(),
                notes: rejectionReason || 'Payment not verified',
            });

            toast({
                title: "Investment Rejected",
                description: `${investment.user_email}'s request has been rejected.`,
            });

            setShowDetailsDialog(false);
            setRejectionReason("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleMarkAsReceived = async (investment: PendingInvestment) => {
        setIsProcessing(investment.id);
        try {
            await updateRow('pending_investments', investment.id, {
                status: 'payment_received',
                notes: 'Payment marked as received, awaiting final approval',
            });

            toast({
                title: "Payment Marked as Received",
                description: "Investment moved to processing queue.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_payment_confirmation':
                return <Badge variant="outline" className="text-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case 'payment_received':
                return <Badge variant="secondary" className="text-blue-500"><CheckCircle className="w-3 h-3 mr-1" /> Received</Badge>;
            case 'approved':
                return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Investment Approvals</h2>
                    <p className="text-muted-foreground">Verify and approve QR code payments</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            Pending
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingList.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            Received
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{processingList.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Approved
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedList.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Rejected
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rejectedList.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending">
                        Pending ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="processing">
                        Received ({processingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        Approved ({approvedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                        Rejected ({rejectedList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <InvestmentList
                        investments={pendingList}
                        isLoading={isLoading}
                        onSelect={(inv) => {
                            setSelectedInvestment(inv);
                            setShowDetailsDialog(true);
                        }}
                        actionButton={(inv) => (
                            <Button
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsReceived(inv);
                                }}
                                disabled={isProcessing === inv.id}
                            >
                                {isProcessing === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Received'}
                            </Button>
                        )}
                    />
                </TabsContent>

                <TabsContent value="processing">
                    <InvestmentList
                        investments={processingList}
                        isLoading={isLoading}
                        onSelect={(inv) => {
                            setSelectedInvestment(inv);
                            setShowDetailsDialog(true);
                        }}
                        actionButton={(inv) => (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReject(inv);
                                    }}
                                    disabled={isProcessing === inv.id}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(inv);
                                    }}
                                    disabled={isProcessing === inv.id}
                                >
                                    {isProcessing === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    />
                </TabsContent>

                <TabsContent value="approved">
                    <InvestmentList
                        investments={approvedList}
                        isLoading={isLoading}
                        onSelect={() => { }}
                    />
                </TabsContent>

                <TabsContent value="rejected">
                    <InvestmentList
                        investments={rejectedList}
                        isLoading={isLoading}
                        onSelect={() => { }}
                    />
                </TabsContent>
            </Tabs>

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Investment Details</DialogTitle>
                        <DialogDescription>Review payment details before approval</DialogDescription>
                    </DialogHeader>

                    {selectedInvestment && (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Status</span>
                                {getStatusBadge(selectedInvestment.status)}
                            </div>

                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">User</span>
                                    <span className="font-medium">{selectedInvestment.user_email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Plan</span>
                                    <span className="font-medium">{selectedInvestment.plan_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className="font-bold">${selectedInvestment.amount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Expected Return</span>
                                    <span className="font-bold text-green-600">${selectedInvestment.expected_return}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment Method</span>
                                    <span className="font-medium uppercase">{selectedInvestment.payment_method}</span>
                                </div>
                            </div>

                            {/* Transaction ID */}
                            {selectedInvestment.transaction_id && (
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <p className="text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Transaction ID:
                                    </p>
                                    <code className="text-xs break-all font-mono">{selectedInvestment.transaction_id}</code>
                                </div>
                            )}

                            {/* Proof Screenshot */}
                            {selectedInvestment.proof_image_url && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Payment Proof Screenshot:
                                    </p>
                                    <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                                        <Image
                                            src={selectedInvestment.proof_image_url}
                                            alt="Payment Proof"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <a
                                        href={selectedInvestment.proof_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        View Full Image
                                    </a>
                                </div>
                            )}

                            <div className="p-3 bg-yellow-500/10 rounded-lg">
                                <p className="text-sm font-medium text-yellow-700 mb-1">Wallet Address Used:</p>
                                <code className="text-xs break-all">{selectedInvestment.wallet_address}</code>
                            </div>

                            {selectedInvestment.status === 'payment_received' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Rejection Reason (optional)</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md text-sm"
                                        placeholder="Enter reason if rejecting..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        {selectedInvestment?.status === 'payment_received' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleReject(selectedInvestment)}
                                    disabled={isProcessing === selectedInvestment?.id}
                                    className="w-full sm:w-auto"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                </Button>
                                <Button
                                    onClick={() => handleApprove(selectedInvestment)}
                                    disabled={isProcessing === selectedInvestment?.id}
                                    className="w-full sm:w-auto"
                                >
                                    {isProcessing === selectedInvestment?.id ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <><CheckCircle className="mr-2 h-4 w-4" /> Approve Investment</>
                                    )}
                                </Button>
                            </>
                        )}
                        {selectedInvestment?.status === 'pending_payment_confirmation' && (
                            <>
                                {!selectedInvestment.proof_image_url && (
                                    <div className="p-3 bg-red-500/10 rounded-lg mb-3">
                                        <p className="text-sm text-red-600 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            No payment proof submitted yet
                                        </p>
                                    </div>
                                )}
                                <Button
                                    onClick={() => handleMarkAsReceived(selectedInvestment)}
                                    disabled={isProcessing === selectedInvestment?.id || !selectedInvestment.proof_image_url}
                                    className="w-full"
                                >
                                    {isProcessing === selectedInvestment?.id ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <><CheckCircle className="mr-2 h-4 w-4" /> Mark Payment as Received</>
                                    )}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InvestmentList({
    investments,
    isLoading,
    onSelect,
    actionButton
}: {
    investments: PendingInvestment[],
    isLoading: boolean,
    onSelect: (inv: PendingInvestment) => void,
    actionButton?: (inv: PendingInvestment) => React.ReactNode
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (investments.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No investments in this category</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <ScrollArea className="h-[500px]">
            <div className="space-y-2">
                {investments.map((inv) => (
                    <Card
                        key={inv.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onSelect(inv)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{inv.user_email}</p>
                                        <p className="text-sm text-muted-foreground">{inv.plan_name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">${inv.amount}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(inv.created_at).toLocaleDateString('en-US')}
                                    </p>
                                </div>
                                {actionButton && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        {actionButton(inv)}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}

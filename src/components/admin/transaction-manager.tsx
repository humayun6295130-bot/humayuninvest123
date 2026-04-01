"use client";

import { useRealtimeCollection, updateRow, incrementBalance, deleteRow } from "@/firebase";
import { db } from "@/firebase/config";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { activateInvestmentAfterVerifiedPayment } from "@/lib/activate-qr-investment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function TransactionManager() {
    const { toast } = useToast();
    const [viewingProof, setViewingProof] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState("pending");

    const transactionsOptions = useMemo(() => ({
        table: 'transactions',
        filters: filterStatus !== "all"
            ? [{ column: 'status', operator: '==' as const, value: filterStatus }]
            : [],
        enabled: true,
    }), [filterStatus]);

    const { data: transactionsRaw, isLoading } = useRealtimeCollection(transactionsOptions);

    const transactions = useMemo(() => {
        if (!transactionsRaw?.length) return transactionsRaw;
        return [...transactionsRaw].sort((a: any, b: any) => {
            const ta = new Date(a.created_at || 0).getTime();
            const tb = new Date(b.created_at || 0).getTime();
            return tb - ta;
        });
    }, [transactionsRaw]);

    const determinePlan = (amount: number): string => {
        if (amount >= 5000) return "Diamond";
        if (amount >= 2501) return "Elite";
        if (amount >= 1001) return "Platinum";
        if (amount >= 501) return "Gold";
        if (amount >= 251) return "Silver";
        if (amount >= 30) return "Starter";
        return "None";
    }

    const handleApproval = async (transaction: any) => {
        try {
            const txType = String(transaction.type || "").toLowerCase();
            const uid = transaction.user_id;
            const txHash = String(transaction.transaction_hash || "").trim();

            if (txType === "investment" || txType === "plan_activation") {
                if (!db) throw new Error("Database not configured");
                if (!txHash) {
                    toast({
                        variant: "destructive",
                        title: "Missing transaction hash",
                        description: "Cannot activate a plan without a blockchain transaction ID. Use Payment proofs or Investment approval.",
                    });
                    return;
                }

                let planId =
                    (transaction.metadata && (transaction.metadata.plan_id as string)) ||
                    (transaction.plan_id as string | undefined);
                let planName = (transaction.plan_name as string | undefined) || "";

                if (!planId) {
                    const pvSnap = await getDocs(
                        query(collection(db, "payment_verifications"), where("transaction_hash", "==", txHash), limit(25))
                    );
                    const hit = pvSnap.docs
                        .map((d) => d.data())
                        .find((p) => p.user_id === uid && p.plan_id);
                    if (hit?.plan_id) {
                        planId = String(hit.plan_id);
                        planName = planName || String(hit.plan_name || "");
                    }
                }

                if (!planId) {
                    toast({
                        variant: "destructive",
                        title: "Cannot activate investment",
                        description:
                            "This pending row has no plan linked. Open Payment proofs → verify the payment, or approve from Pending investments (QR flow).",
                    });
                    return;
                }

                const planSnap = await getDoc(doc(db, "investment_plans", planId));
                const p = planSnap.exists() ? planSnap.data() : null;
                const retPct = Number(p?.return_percent) || 0;
                const duration = Number(p?.duration_days) || 30;
                const amt = Math.abs(Number(transaction.amount) || 0);
                const expectedReturn =
                    Number(p?.expected_return) && Number.isFinite(Number(p?.expected_return))
                        ? Number(p?.expected_return)
                        : amt * (1 + retPct / 100);

                await deleteRow("transactions", transaction.id);

                await activateInvestmentAfterVerifiedPayment({
                    user_id: uid,
                    user_email: transaction.user_email || "",
                    plan_id: planId,
                    plan_name: planName || String(p?.name || "Investment plan"),
                    daily_roi_percent: Number(p?.daily_roi_percent) || 0,
                    return_percent: retPct,
                    amount: amt,
                    expected_return: expectedReturn,
                    duration_days: duration,
                    transaction_id: txHash.toLowerCase(),
                    proof_image_url: transaction.proof_url || transaction.metadata?.screenshot_url || null,
                    wallet_address: String(transaction.metadata?.wallet_address_used || "admin_tx_approve"),
                    payment_method: "usdt_bep20_admin_txlist",
                    notes: "Recovered from pending transaction approval (admin)",
                });

                toast({
                    title: "Investment activated",
                    description: `Plan opened for ${transaction.user_email || uid} — wallet was not credited as deposit.`,
                });
                return;
            }

            await updateRow("transactions", transaction.id, { status: "completed" });

            const plan = determinePlan(transaction.amount);
            await incrementBalance(transaction.user_id, transaction.amount);
            await updateRow("users", transaction.user_id, { active_plan: plan });

            toast({
                title: "Transaction Approved",
                description: `${transaction.user_display_name}'s deposit of $${transaction.amount} was successful.`,
            });
        } catch (error) {
            console.error("Approval failed: ", error);
            toast({
                variant: "destructive",
                title: "Approval Failed",
                description: error instanceof Error ? error.message : "Could not approve the transaction.",
            });
        }
    };

    const handleRejection = async (transactionId: string) => {
        try {
            await updateRow("transactions", transactionId, { status: "failed" });
            toast({
                title: "Transaction Rejected",
                description: "The transaction has been marked as failed."
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Rejection Failed",
                description: "Could not reject the transaction."
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {["pending", "completed", "failed", "all"].map((status) => (
                    <Button
                        key={status}
                        variant={filterStatus === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus(status)}
                        className="capitalize"
                    >
                        {status}
                    </Button>
                ))}
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Transactions List</CardTitle>
                    <CardDescription>Review financial activity across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Proof</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Loading transactions...</TableCell>
                                </TableRow>
                            ) : transactions && transactions.length > 0 ? (
                                transactions.map((tx: any) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {tx.created_at ? format(new Date(tx.created_at), 'MMM d, HH:mm') : 'Pending...'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{tx.user_display_name || 'User'}</div>
                                            <div className="text-xs text-muted-foreground">{tx.user_email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={tx.type === 'deposit' ? 'default' : 'secondary'} className="capitalize">
                                                {tx.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-[#334C99]">${tx.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            {tx.proof_url ? (
                                                <Button variant="ghost" size="sm" onClick={() => setViewingProof(tx.proof_url)}>
                                                    <ImageIcon className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No proof</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {tx.status === 'pending' ? (
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" onClick={() => handleApproval(tx)} className="bg-green-600 hover:bg-green-700">Approve</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleRejection(tx.id)}>Reject</Button>
                                                </div>
                                            ) : (
                                                <Badge variant={tx.status === 'completed' ? 'default' : 'destructive'} className="capitalize">
                                                    {tx.status}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transactions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment Proof</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center">
                        {viewingProof && <img src={viewingProof} alt="Payment Proof" className="max-w-full rounded-lg shadow-md" />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
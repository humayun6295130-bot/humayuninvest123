"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, writeBatch, increment, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Eye, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TransactionManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [viewingProof, setViewingProof] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState("pending");

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, "transactions"), orderBy("timestamp", "desc"));
        if (filterStatus !== "all") {
            q = query(collection(firestore, "transactions"), where("status", "==", filterStatus), orderBy("timestamp", "desc"));
        }
        return q;
    }, [firestore, filterStatus]);

    const { data: transactions, isLoading } = useCollection(transactionsQuery);

    const determinePlan = (amount: number): string => {
        if (amount >= 50) return "Professional Plan";
        if (amount >= 30) return "Growth Plan";
        if (amount >= 25) return "Starter Plan";
        return "None";
    }

    const handleApproval = async (transaction: any) => {
        if (!firestore) return;
        
        const batch = writeBatch(firestore);
        const txRef = doc(firestore, "transactions", transaction.id);
        batch.update(txRef, { status: "completed" });

        const userRef = doc(firestore, "users", transaction.userId);
        const plan = determinePlan(transaction.amount);
        batch.update(userRef, { 
            balance: increment(transaction.amount),
            activePlan: plan
        });

        try {
            await batch.commit();
            toast({
                title: "Transaction Approved",
                description: `${transaction.userDisplayName}'s deposit of $${transaction.amount} was successful.`
            })
        } catch (error) {
            console.error("Approval failed: ", error);
            toast({
                variant: "destructive",
                title: "Approval Failed",
                description: "Could not approve the transaction."
            })
        }
    }

    const handleRejection = async (transactionId: string) => {
        if (!firestore) return;
        const txRef = doc(firestore, "transactions", transactionId);
        try {
            await updateDoc(txRef, { status: "failed" });
            toast({
                title: "Transaction Rejected",
                description: "The transaction has been marked as failed."
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Rejection Failed",
                description: "Could not reject the transaction."
            })
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
                                transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {tx.timestamp ? format(tx.timestamp.toDate(), 'MMM d, HH:mm') : 'Pending...'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{tx.userDisplayName || 'User'}</div>
                                            <div className="text-xs text-muted-foreground">{tx.userEmail}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={tx.type === 'deposit' ? 'default' : 'secondary'} className="capitalize">
                                                {tx.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-[#334C99]">${tx.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            {tx.proofUrl ? (
                                                <Button variant="ghost" size="sm" onClick={() => setViewingProof(tx.proofUrl)}>
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

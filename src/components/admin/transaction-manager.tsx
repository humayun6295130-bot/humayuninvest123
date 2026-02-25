"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, writeBatch, increment } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function TransactionManager() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const pendingTransactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "transactions"), where("status", "==", "pending"));
    }, [firestore]);

    const { data: transactions, isLoading } = useCollection(pendingTransactionsQuery);

    const determinePlan = (amount: number): string => {
        if (amount >= 50) return "Professional Plan";
        if (amount >= 30) return "Growth Plan";
        if (amount >= 25) return "Starter Plan";
        return "None";
    }

    const handleApproval = async (transaction: any) => {
        if (!firestore) return;
        
        const batch = writeBatch(firestore);

        // 1. Update the transaction status
        const txRef = doc(firestore, "transactions", transaction.id);
        batch.update(txRef, { status: "completed" });

        // 2. Update the user's balance and active plan
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
            const batch = writeBatch(firestore);
            batch.update(txRef, { status: "failed" });
            await batch.commit();
            toast({
                variant: "destructive",
                title: "Transaction Rejected",
                description: "The transaction has been marked as failed."
            });
        } catch (error) {
             console.error("Rejection failed: ", error);
             toast({
                variant: "destructive",
                title: "Rejection Failed",
                description: "Could not reject the transaction."
            })
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction Management</CardTitle>
                <CardDescription>Review and approve or reject pending user transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Tx Hash / Address</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Loading pending transactions...</TableCell>
                            </TableRow>
                        ) : transactions && transactions.length > 0 ? (
                            transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="text-xs">{tx.timestamp ? format(tx.timestamp.toDate(), 'P p') : ''}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{tx.userDisplayName}</div>
                                        <div className="text-xs text-muted-foreground">{tx.userEmail}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={tx.type === 'deposit' ? 'default' : 'secondary'} className="capitalize">{tx.type}</Badge>
                                    </TableCell>
                                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-xs max-w-xs truncate">{tx.transactionHash || tx.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" onClick={() => handleApproval(tx)}>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleRejection(tx.id)}>Reject</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No pending transactions.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

    
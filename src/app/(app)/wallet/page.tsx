"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Copy, Wallet as WalletIcon, Landmark, ArrowDownUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function WalletPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const walletAddress = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${walletAddress}`;

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, "users", user.uid);
    }, [firestore, user]);

    const { data: userProfile } = useDoc(userDocRef);

    const transactionsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/transactions`);
    }, [user, firestore]);

    const { data: transactions } = useCollection(transactionsQuery);

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "Copied!",
            description: "Deposit address copied to clipboard.",
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(value);
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'outline';
            case 'pending': return 'secondary';
            case 'failed': return 'destructive';
            default: return 'secondary';
        }
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <WalletIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {userProfile ? formatCurrency(userProfile.balance || 0) : '$0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">Your total account balance.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fund Your Account</CardTitle>
                            <CardDescription>Scan the QR code or copy the address to deposit funds.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="p-2 bg-white rounded-lg">
                                <Image
                                    src={qrCodeUrl}
                                    alt="Payment QR Code"
                                    width={150}
                                    height={150}
                                    className="rounded-md"
                                />
                            </div>
                            <div className="w-full space-y-2 text-center">
                                <p className="text-xs font-medium text-muted-foreground">Deposit Address</p>
                                <div className="flex items-center gap-2 rounded-md border p-2 bg-muted">
                                   <p className="text-xs font-mono break-all flex-1">{walletAddress}</p>
                                    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                             <div className="w-full text-center">
                                <Button disabled>
                                    <Landmark className="mr-2 h-4 w-4" />
                                    Withdraw Funds
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                             <div className="flex items-center gap-2">
                                <ArrowDownUp className="h-5 w-5" />
                                <CardTitle>Transaction History</CardTitle>
                            </div>
                            <CardDescription>A record of your recent account activity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions && transactions.length > 0 ? (
                                        transactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="text-xs text-muted-foreground">{tx.timestamp ? format(tx.timestamp.toDate(), 'PPpp') : ''}</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.type === 'deposit' ? 'default' : 'secondary'} className="capitalize">{tx.type}</Badge>
                                                </TableCell>
                                                <TableCell>{tx.description || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(tx.status) as any} className="capitalize">{tx.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No transactions yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

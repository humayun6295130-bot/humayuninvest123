"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";

const walletAddress = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`;

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  transactionHash: z.string().min(10, "Please enter a valid transaction hash."),
});


const DepositDialog = ({ userProfile }: { userProfile: any }) => {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, transactionHash: "" },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Copied!",
      description: "Deposit address copied to clipboard.",
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
     if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    const transaction = {
      userId: user.uid,
      userDisplayName: userProfile.displayName,
      userEmail: userProfile.email,
      type: "deposit",
      amount: values.amount,
      currency: "USD",
      status: "pending",
      timestamp: serverTimestamp(),
      description: `Deposit request`,
      transactionHash: values.transactionHash
    };

    const transactionsRef = collection(firestore, `transactions`);
    addDocumentNonBlocking(transactionsRef, transaction);

    toast({
      title: "Deposit Request Submitted",
      description: `Your request to deposit $${values.amount} has been submitted for review.`,
    });

    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Deposit Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fund Your Account</DialogTitle>
          <DialogDescription>
            Send funds to the address below, then enter the details to submit your deposit for verification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 pt-4">
            <div className="p-2 bg-white rounded-lg border">
                <Image src={qrCodeUrl} alt="Deposit QR Code" width={200} height={200} />
            </div>
            <div className="w-full space-y-2 text-center">
                <p className="text-sm font-medium text-muted-foreground">Deposit Address</p>
                <div className="flex items-center gap-2 rounded-md border p-2 bg-muted">
                    <p className="text-sm font-mono break-all flex-1">{walletAddress}</p>
                    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                        <Copy className="h-3 w-3" />
                        <span className="sr-only">Copy Address</span>
                    </Button>
                </div>
            </div>
        </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="transactionHash"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Transaction Hash / ID</FormLabel>
                        <FormControl><Input placeholder="Enter the TXID from your wallet" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit">Submit Deposit</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositDialog;

    
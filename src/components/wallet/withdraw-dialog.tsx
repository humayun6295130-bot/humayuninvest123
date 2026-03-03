"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser, insertRow } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Landmark } from "lucide-react";

const WithdrawDialog = ({ userProfile }: { userProfile: any }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const formSchema = z.object({
    walletAddress: z.string().min(10, "Please enter a valid wallet address."),
    amount: z.coerce
      .number()
      .positive("Amount must be a positive number.")
      .min(50, "Minimum withdrawal amount is $50.")
      .max(userProfile?.balance || 0, "Withdrawal amount cannot exceed your current balance."),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      walletAddress: "",
      amount: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    try {
      await insertRow("transactions", {
        user_id: user.uid,
        user_display_name: userProfile.display_name,
        user_email: userProfile.email,
        type: "withdrawal",
        amount: values.amount,
        currency: "USD",
        status: "pending",
        description: `Withdrawal to ${values.walletAddress}`,
      });

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your request to withdraw ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(values.amount)} has been submitted for processing.`,
      });

      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to submit withdrawal." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Landmark className="mr-2 h-4 w-4" />
          Withdraw Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request a Withdrawal</DialogTitle>
          <DialogDescription>
            Enter your withdrawal address and the amount you wish to withdraw. Requests are processed within 24 hours.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="walletAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Wallet Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your destination wallet ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-sm text-muted-foreground">
              Available to withdraw: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(userProfile?.balance || 0)}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
"use client";

import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, Copy, X, ImageIcon, QrCode as QrCodeIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser, insertRow, uploadFile } from "@/firebase";
import { getAdminWalletAddress, generateBEP20QRCode, getWalletInfo, isWalletConfigured } from "@/lib/wallet-config";
import { QrPaymentDialog, type InvestmentPlan } from "@/components/invest/qr-payment-dialog";
import { NOWPAYMENTS_WALLET_PLAN_ID } from "@/lib/investment-order-id";

// Get safe version for internal usage
const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();
const walletReady = isWalletConfigured();

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number.").min(10, "Minimum deposit is $10"),
  transactionHash: z.string().min(5, "Please enter a valid transaction hash or reference."),
});

export default function DepositDialog({ userProfile }: { userProfile: any }) {
  const { toast } = useToast();
  const { user, isUserLoading, isProfileLoading } = useUser();
  const [open, setOpen] = useState(false);
  const [npOpen, setNpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const walletInfo = getWalletInfo();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, transactionHash: "" },
  });

  const depositAmount = form.watch("amount") || 0;

  const nowpaymentsTopUpPlan = useMemo((): InvestmentPlan | null => {
    const a = Number(depositAmount);
    if (!Number.isFinite(a) || a < 10) return null;
    return {
      id: NOWPAYMENTS_WALLET_PLAN_ID,
      name: "Wallet top-up",
      min_amount: a,
      max_amount: a,
      fixed_amount: a,
      duration_days: 1,
      return_percent: 0,
      daily_roi_percent: 0,
    };
  }, [depositAmount]);

  const handleCopy = () => {
    if (!ADMIN_WALLET_ADDRESS) {
      toast({ variant: "destructive", title: "No address", description: "Deposit wallet is not configured on the server." });
      return;
    }
    navigator.clipboard.writeText(ADMIN_WALLET_ADDRESS);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Wait for auth to finish loading
    if (isUserLoading || isProfileLoading) {
      toast({ variant: "destructive", title: "Please wait", description: "Authentication is loading..." });
      return;
    }

    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated. Please log in again." });
      return;
    }

    // Use userProfile from props or fallback to user data
    const profile = userProfile || {
      display_name: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email
    };

    setIsLoading(true);

    try {
      let proofUrl = "";
      if (selectedFile) {
        try {
          const uploadPromise = uploadFile(selectedFile, user.uid);
          const timeout = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout')), 15000)
          );
          proofUrl = await Promise.race([uploadPromise, timeout]);
        } catch (uploadErr) {
          console.warn('File upload failed, continuing without proof:', uploadErr);
        }
      }

      await insertRow("transactions", {
        user_id: user.uid,
        user_display_name: profile.display_name,
        user_email: profile.email,
        type: "deposit",
        amount: values.amount,
        currency: "USD",
        status: "pending",
        description: `Deposit request via ${values.transactionHash}`,
        transaction_hash: values.transactionHash,
        proof_url: proofUrl,
      });

      toast({
        title: "Deposit Submitted",
        description: "Your request is being reviewed by our team.",
      });

      setOpen(false);
      form.reset();
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit deposit. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
          <QrCodeIcon className="mr-2 h-4 w-4" />
          Deposit Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border-orange-500/20">
        <DialogHeader>
          <DialogTitle className="text-orange-400">Deposit Funds</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add funds with NOWPayments (recommended) or send USDT manually and submit proof for admin review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {nowpaymentsTopUpPlan && user?.uid && (
            <div className="space-y-2">
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                onClick={() => setNpOpen(true)}
              >
                <QrCodeIcon className="mr-2 h-4 w-4" />
                Pay with NOWPayments (USDT BEP20)
              </Button>
              <p className="text-[11px] text-slate-500 text-center">
                Same gateway as Invest — no BscScan API needed. Your balance updates when payment completes.
              </p>
              <QrPaymentDialog
                open={npOpen}
                onOpenChange={setNpOpen}
                plan={nowpaymentsTopUpPlan}
                userId={user.uid}
                userEmail={userProfile?.email || user?.email || undefined}
                customAmount={Number(depositAmount)}
                paymentPurpose="wallet_deposit"
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Or manual transfer</span>
            </div>
          </div>
          {!walletReady && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <p className="font-medium text-amber-200">Receive address not shown in UI yet</p>
              <p className="mt-1 text-amber-100/90">
                You can still submit amount, TXID, and proof — admin will match manually. For the address and QR here, add{" "}
                <span className="font-mono">NEXT_PUBLIC_BSC_ADMIN_WALLET_ADDRESS</span> in hosting env and redeploy.
              </p>
            </div>
          )}
          {/* Wallet Address Section */}
          <div className="p-4 bg-slate-800 rounded-xl border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-orange-400 uppercase">{walletInfo.network} Address</p>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">USDT</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
              <code className="text-xs break-all flex-1 text-orange-300 font-mono">
                {ADMIN_WALLET_ADDRESS || "— not configured —"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={!walletReady}
                className="h-8 w-8 hover:text-orange-400"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 bg-slate-800 rounded-xl border border-orange-500/20 flex flex-col items-center">
            <p className="text-xs font-semibold text-orange-400 uppercase mb-3">Scan QR Code to Pay</p>
            <div className="bg-white p-3 rounded-lg border-2 border-dashed border-orange-200">
              {depositAmount > 0 ? (
                <img
                  src={generateBEP20QRCode(depositAmount)}
                  alt="Payment QR Code"
                  className="w-[200px] h-[200px] rounded-lg"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-[#1a1a1a] rounded-lg">
                  <QrCodeIcon className="w-16 h-16 text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400 text-center px-4">
                    Enter amount below<br />to generate QR code
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              {walletInfo.scanInstructions}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Deposit Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        className="bg-slate-800 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Transaction ID / Hash</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Paste your TXID here"
                        {...field}
                        className="bg-slate-800 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel className="text-slate-300">Payment Proof (Optional)</FormLabel>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2
                    ${selectedFile ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 hover:border-orange-500 bg-slate-800'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 w-full">
                      <ImageIcon className="h-5 w-5 text-orange-400" />
                      <span className="text-sm truncate flex-1 text-slate-300">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:bg-red-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <div className="text-center">
                        <p className="text-sm text-slate-400">Click to upload screenshot</p>
                        <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                      </div>
                    </>
                  )}
                </div>
                <FormDescription className="text-slate-500">
                  Uploading a screenshot of your transaction helps speed up verification.
                </FormDescription>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Complete Deposit"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

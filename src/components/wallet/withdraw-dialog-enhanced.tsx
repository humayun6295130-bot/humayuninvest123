"use client";

/**
 * Enhanced Withdraw Dialog with BEP20/BNB Smart Chain Features
 * 
 * Features:
 * - BEP20 address validation
 * - Network fee calculator
 * - Real-time balance checking
 * - Withdrawal preview
 */

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Landmark,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ArrowRight,
    Wallet,
    Zap,
    Gauge,
    Info,
} from "lucide-react";
import { useUser, insertRow } from "@/firebase";
import { db } from "@/firebase/config";
import { doc, runTransaction } from "firebase/firestore";
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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { appendFinancialActivity } from "@/lib/financial-activity-log";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAddressValidator, useFeeCalculator } from "@/hooks/use-bep20";
import { isValidBEP20Address } from "@/lib/bep20";
import {
    getMainBalanceUsd,
    getReferralBalanceUsd,
    getWithdrawableUsd,
    maxWithdrawRequestAmountUsd,
    roundMoney2,
    splitWithdrawDeduction,
} from "@/lib/wallet-totals";

interface WithdrawDialogEnhancedProps {
    userProfile: any;
}

const formSchema = z.object({
    walletAddress: z.string()
        .min(42, "BEP20 address must be 42 characters")
        .max(42, "BEP20 address must be 42 characters")
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid BEP20 address format. Must start with '0x'"),
    amount: z.coerce
        .number()
        .positive("Amount must be a positive number")
        .min(50, "Minimum withdrawal amount is $50 USD")
        .max(10000, "Maximum withdrawal amount is 10,000 USDT"),
});

// Withdrawal fee percentage
const WITHDRAWAL_FEE_PERCENTAGE = 8;

export function WithdrawDialogEnhanced({ userProfile }: WithdrawDialogEnhancedProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'form' | 'preview' | 'processing' | 'success'>('form');
    const [withdrawalData, setWithdrawalData] = useState<any>(null);

    // Address validation hook
    const { isValid: addressValid, isValidating, validate } = useAddressValidator();

    // Fee calculator hook
    const { fee, isCalculating, calculate } = useFeeCalculator();

    // Get user's saved BEP20 wallet address
    const savedWalletAddress = userProfile?.bep20_wallet_address || "";

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            walletAddress: savedWalletAddress,
            amount: 0,
        },
    });

    // Check if user has a saved wallet address
    const hasSavedWallet = !!savedWalletAddress;

    // Show warning if user doesn't have a saved wallet
    useEffect(() => {
        if (!hasSavedWallet && open) {
            toast({
                title: "Wallet Not Connected",
                description: "Please add your BEP20 wallet address in Settings before withdrawing.",
                variant: "default",
            });
        }
    }, [open, hasSavedWallet]);

    const withdrawable = useMemo(() => getWithdrawableUsd(userProfile), [userProfile]);
    const mainBal = useMemo(() => getMainBalanceUsd(userProfile), [userProfile]);
    const refBal = useMemo(() => getReferralBalanceUsd(userProfile), [userProfile]);
    const maxRequestUsd = useMemo(
        () => maxWithdrawRequestAmountUsd(withdrawable, WITHDRAWAL_FEE_PERCENTAGE),
        [withdrawable]
    );

    // Watch form values for real-time validation
    const watchAddress = form.watch("walletAddress");
    const watchAmount = form.watch("amount");

    // Validate address on change
    useEffect(() => {
        if (watchAddress && watchAddress.length === 42) {
            const isValid = isValidBEP20Address(watchAddress);
            validate(watchAddress);

            if (!isValid) {
                form.setError("walletAddress", {
                    type: "manual",
                    message: "Invalid BEP20 address format",
                });
            } else {
                form.clearErrors("walletAddress");
            }
        }
    }, [watchAddress, form, validate]);

    // Calculate fee when amount changes
    useEffect(() => {
        if (watchAddress && watchAmount && watchAmount > 0 && isValidBEP20Address(watchAddress)) {
            // Use admin wallet as sender for fee estimation
            const senderAddress = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
            if (senderAddress) {
                calculate(senderAddress, watchAddress, watchAmount);
            }
        }
    }, [watchAddress, watchAmount, calculate]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user || !userProfile) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
            return;
        }

        const withdrawable = getWithdrawableUsd(userProfile);
        const maxReq = maxWithdrawRequestAmountUsd(withdrawable, WITHDRAWAL_FEE_PERCENTAGE);
        if (values.amount > maxReq) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: `Max you can request (after ${WITHDRAWAL_FEE_PERCENTAGE}% fee) is about $${maxReq.toFixed(2)} from your combined wallet.`,
            });
            return;
        }

        // Validate address
        if (!isValidBEP20Address(values.walletAddress)) {
            toast({ variant: "destructive", title: "Invalid Address", description: "Please enter a valid BEP20 address." });
            return;
        }

        setWithdrawalData(values);
        setStep('preview');
    };

    const processWithdrawal = async () => {
        setStep('processing');

        const feeAmount = getFeeAmount();
        const totalDeduct = getTotalDeduction();

        try {
            if (!db || !user?.uid) throw new Error("Not authenticated");

            // Atomically deduct balance and create withdrawal record
            const userRef = doc(db, 'users', user.uid);
            let deductedFromMain = 0;
            let deductedFromReferral = 0;
            await runTransaction(db, async (tx) => {
                const userSnap = await tx.get(userRef);
                if (!userSnap.exists()) throw new Error("User not found");
                const mainUsd = getMainBalanceUsd(userSnap.data());
                const refUsd = getReferralBalanceUsd(userSnap.data());
                const { fromMain, fromRef } = splitWithdrawDeduction(totalDeduct, mainUsd, refUsd);
                deductedFromMain = fromMain;
                deductedFromReferral = fromRef;
                const nowIso = new Date().toISOString();
                tx.update(userRef, {
                    balance: roundMoney2(mainUsd - fromMain),
                    referral_balance: roundMoney2(refUsd - fromRef),
                    updated_at: nowIso,
                });
            });

            const requestedAt = new Date().toISOString();
            const txRow = await insertRow("transactions", {
                user_id: user?.uid,
                user_display_name: userProfile.display_name,
                user_email: userProfile.email,
                type: "withdrawal",
                amount: withdrawalData.amount,
                currency: "USDT",
                status: "pending",
                description: `Withdrawal to ${withdrawalData.walletAddress}`,
                wallet_address: withdrawalData.walletAddress,
                recipient_address: withdrawalData.walletAddress,
                requested_at: requestedAt,
                balance_deducted_on_request: true,
                network_fee_estimate: fee?.estimatedTrxFee ?? fee?.totalFee ?? 0,
                withdrawal_fee: feeAmount,
                withdrawal_fee_percentage: WITHDRAWAL_FEE_PERCENTAGE,
                total_deduction: totalDeduct,
                deducted_from_main_usd: roundMoney2(deductedFromMain),
                deducted_from_referral_usd: roundMoney2(deductedFromReferral),
                metadata: {
                    network: "BEP20",
                    fee_data: fee,
                    address_validated: true,
                },
            });

            try {
                await appendFinancialActivity({
                    user_id: user.uid,
                    kind: "withdrawal_request",
                    amount_usd: withdrawalData.amount,
                    source: "user",
                    note: `Fee incl. total deducted: $${totalDeduct.toFixed(2)}`,
                    linked_transaction_id: txRow.id,
                });
            } catch (logErr) {
                console.error("Withdrawal activity log (non-fatal):", logErr);
            }

            setStep('success');

            toast({
                title: "Withdrawal Request Submitted",
                description: `Your request to withdraw ${withdrawalData.amount} USDT has been submitted for processing.`,
            });

            // Close dialog after success
            setTimeout(() => {
                setOpen(false);
                setStep('form');
                form.reset();
            }, 3000);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message || "Failed to submit withdrawal." });
            setStep('preview');
        }
    };

    // Calculate total deduction with 8% fee
    const getTotalDeduction = () => {
        if (!withdrawalData?.amount) return 0;
        const fee = withdrawalData.amount * (WITHDRAWAL_FEE_PERCENTAGE / 100);
        return withdrawalData.amount + fee;
    };

    // Calculate just the fee amount
    const getFeeAmount = () => {
        if (!withdrawalData?.amount) return 0;
        return withdrawalData.amount * (WITHDRAWAL_FEE_PERCENTAGE / 100);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Landmark className="mr-2 h-4 w-4" />
                    Withdraw Funds
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'form' && "Request a Withdrawal"}
                        {step === 'preview' && "Confirm Withdrawal"}
                        {step === 'processing' && "Processing..."}
                        {step === 'success' && "Success!"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'form' && "Enter your withdrawal details. Transactions are processed within 24 hours."}
                        {step === 'preview' && "Review your withdrawal details before confirming."}
                        {step === 'processing' && "Please wait while we process your request..."}
                        {step === 'success' && "Your withdrawal request has been submitted successfully."}
                    </DialogDescription>
                </DialogHeader>

                {step === 'form' && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            {/* Available Balance */}
                            <Card className="bg-muted">
                                <CardContent className="pt-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">Withdrawable (total)</span>
                                        <span className="font-bold text-lg">
                                            {withdrawable.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Main wallet</span>
                                        <span>{mainBal.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Referral balance</span>
                                        <span>{refBal.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                                        One withdrawal uses both pools (referral first), incl. {WITHDRAWAL_FEE_PERCENTAGE}% fee. Max request ≈{" "}
                                        {maxRequestUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Wallet Address Field */}
                            <FormField
                                control={form.control}
                                name="walletAddress"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            BEP20 Wallet Address (BNB Smart Chain)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="0x... (42 characters)"
                                                {...field}
                                                className="font-mono"
                                                maxLength={42}
                                            />
                                        </FormControl>
                                        {hasSavedWallet && !watchAddress && (
                                            <FormDescription className="text-green-600">
                                                Using your saved wallet address from Settings
                                            </FormDescription>
                                        )}
                                        {!hasSavedWallet && (
                                            <FormDescription>
                                                Add your wallet in Settings to auto-fill this field
                                            </FormDescription>
                                        )}
                                        <FormMessage />

                                        {/* Address Validation Indicator */}
                                        {watchAddress.length === 42 && (
                                            <div className="flex items-center gap-2 mt-1">
                                                {isValidating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                                                ) : addressValid ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        <span className="text-xs text-green-600">Valid BEP20 address</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                        <span className="text-xs text-red-600">Invalid address format</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </FormItem>
                                )}
                            />

                            {/* Amount Field */}
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            Amount (USDT)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Enter amount"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Min: $50 • Max: $10,000 request • {WITHDRAWAL_FEE_PERCENTAGE}% fee • combined balance limit ≈ $
                                            {maxRequestUsd.toFixed(2)}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Network Fee Estimate */}
                            {fee && watchAmount > 0 && (
                                <Card className="bg-amber-50 border-amber-200">
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-center gap-2 text-amber-800 font-medium">
                                            <Gauge className="w-4 h-4" />
                                            Network Fee Estimate (BNB Smart Chain)
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Gas Limit</span>
                                                <span>{fee.gasLimit.toLocaleString('en-US')} units</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Gas Price</span>
                                                <span>{fee.gasPrice} Gwei</span>
                                            </div>
                                            <div className="flex justify-between font-medium">
                                                <span className="text-muted-foreground">Total Fee</span>
                                                <span>~{fee.totalFee} {fee.unit}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-amber-600">
                                            This fee is paid to the BNB Smart Chain network, not to us.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                                <Info className="h-4 w-4 text-yellow-600" />
                                <AlertDescription className="text-yellow-700 text-xs">
                                    Double-check your wallet address. Transactions on the blockchain are irreversible.
                                </AlertDescription>
                            </Alert>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!addressValid || isValidating}
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'preview' && withdrawalData && (
                    <div className="space-y-5">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Recipient Address</span>
                                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        {withdrawalData.walletAddress.slice(0, 8)}...{withdrawalData.walletAddress.slice(-8)}
                                    </code>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className="font-bold text-lg">{withdrawalData.amount} USDT</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Network</span>
                                    <Badge variant="secondary">BEP20 (BNB Smart Chain)</Badge>
                                </div>
                                <div className="flex justify-between items-center text-orange-500">
                                    <span className="flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Withdrawal Fee (8%)
                                    </span>
                                    <span className="font-medium">-{getFeeAmount().toFixed(2)} USDT</span>
                                </div>
                                <div className="border-t pt-4 flex justify-between items-center">
                                    <span className="font-medium">Total Deduction</span>
                                    <span className="font-bold text-xl text-primary">{getTotalDeduction().toFixed(2)} USDT</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert variant="default" className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-700 text-sm">
                                Withdrawals are processed within 24 hours. You will receive {withdrawalData.amount} USDT to your wallet after the 8% fee is deducted.
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setStep('form')}
                            >
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={processWithdrawal}
                            >
                                Confirm Withdrawal
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="py-8 flex flex-col items-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Processing your withdrawal request...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="py-8 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-green-800 mb-2">Request Submitted!</h3>
                        <p className="text-center text-muted-foreground">
                            Your withdrawal request has been submitted and is being processed.
                        </p>
                    </div>
                )}

                <DialogFooter className="text-xs text-muted-foreground">
                    Network fees are estimates and may vary based on network conditions.
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

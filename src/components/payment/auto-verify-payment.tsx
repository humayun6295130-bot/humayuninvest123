"use client";

/**
 * Auto-verify payment — BEP20 USDT on BNB Smart Chain (BscScan).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser, insertRow, updateRow } from "@/firebase";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { activateInvestmentAfterVerifiedPayment } from "@/lib/activate-qr-investment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTransactionVerification, useConfirmationTracker } from "@/hooks/use-bep20";
import { isValidTransactionHash, verifyTransactionWithDoubleSpendCheck } from "@/lib/bep20";
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
    ShieldCheck,
    ExternalLink,
    Copy,
    Check,
    RefreshCw,
    XCircle,
} from "lucide-react";

import { getAdminWalletAddress, isWalletConfigured } from "@/lib/wallet-config";

interface AutoVerifyPaymentProps {
    amount: number;
    purpose: "deposit" | "investment" | "plan_activation";
    planId?: string;
    planName?: string;
    onSuccess?: () => void;
    onVerified?: (txData: unknown) => void;
}

function usdtAmountFromVerifiedTx(tx: { value?: string; tokenDecimal?: number } | null | undefined): number {
    if (!tx?.value) return 0;
    const decimals = typeof tx.tokenDecimal === "number" ? tx.tokenDecimal : 18;
    return parseFloat(tx.value) / Math.pow(10, decimals);
}

export function AutoVerifyPayment({
    amount,
    purpose,
    planId,
    planName,
    onSuccess,
    onVerified,
}: AutoVerifyPaymentProps) {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [txID, setTxID] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verificationStep, setVerificationStep] = useState<
        "idle" | "verifying" | "confirming" | "completed" | "failed"
    >("idle");
    const [copied, setCopied] = useState(false);
    const [verifiedTxData, setVerifiedTxData] = useState<Record<string, unknown> | null>(null);
    const completingRef = useRef(false);
    const confirmFnRef = useRef<() => Promise<void>>(async () => {});
    const lastAutoTriggeredHash = useRef<string | null>(null);

    const walletReady = isWalletConfigured();
    const adminAddr = getAdminWalletAddress();

    const txVerifyOptions = useMemo(
        () => ({
            expectedToAddress: walletReady ? adminAddr : undefined,
            expectedAmount: amount,
            minConfirmations: 19 as const,
        }),
        [walletReady, adminAddr, amount]
    );

    const { verify: verifyTx, isVerifying, result: verifyResult } = useTransactionVerification(txVerifyOptions);

    const onConfirmedStable = useCallback(() => {
        void confirmFnRef.current();
    }, []);

    const { confirmations, isChecking, startTracking, stopTracking } = useConfirmationTracker({
        pollInterval: 10000,
        minConfirmations: 19,
        onConfirmed: onConfirmedStable,
    });

    const handleAutoVerify = useCallback(async () => {
        if (!walletReady) {
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "Admin wallet address is not configured.",
            });
            return;
        }
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Please login first" });
            return;
        }

        const hash = txID.trim();
        if (!isValidTransactionHash(hash)) {
            return;
        }

        setVerificationStep("verifying");

        const ds = await verifyTransactionWithDoubleSpendCheck(hash, adminAddr, amount);
        if (ds.alreadyProcessed) {
            toast({
                variant: "destructive",
                title: "Transaction Already Used",
                description: "This transaction has already been processed. Please use a different transaction.",
            });
            setVerificationStep("failed");
            return;
        }

        await verifyTx(hash);
    }, [walletReady, user, toast, txID, adminAddr, amount, verifyTx]);

    useEffect(() => {
        const hash = txID.trim();
        if (!walletReady || verificationStep !== "idle") return;
        if (!isValidTransactionHash(hash)) return;
        if (lastAutoTriggeredHash.current === hash) return;
        lastAutoTriggeredHash.current = hash;
        void handleAutoVerify();
    }, [txID, walletReady, verificationStep, handleAutoVerify]);

    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    useEffect(() => {
        if (!verifyResult) return;

        if (verifyResult.valid) {
            setVerifiedTxData(verifyResult.tx as unknown as Record<string, unknown>);

            if (verifyResult.sufficientConfirmations) {
                void confirmFnRef.current();
            } else {
                setVerificationStep("confirming");
                startTracking(txID.trim());
            }
        } else {
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: verifyResult.error || "Could not verify transaction",
            });
            setVerificationStep("failed");
        }
    }, [verifyResult, toast, startTracking, txID]);

    const handleConfirmationComplete = useCallback(async () => {
        if (completingRef.current) return;
        completingRef.current = true;
        setVerificationStep("completed");

        try {
            setIsSubmitting(true);

            if (!user?.uid) {
                throw new Error("Not signed in");
            }

            const txPayload = verifiedTxData as { value?: string; tokenDecimal?: number; from?: string } | null;
            const investmentAmount =
                txPayload && txPayload.value != null ? usdtAmountFromVerifiedTx(txPayload) : amount;
            const txKey = txID.trim().toLowerCase();
            const sender = typeof txPayload?.from === "string" ? txPayload.from : undefined;

            const isPlanPay =
                (purpose === "plan_activation" || purpose === "investment") && planId && planName && db;

            if (isPlanPay && db) {
                const planSnap = await getDoc(doc(db, "investment_plans", planId!));
                const p = planSnap.exists() ? planSnap.data() : null;
                const retPct = Number(p?.return_percent) || 0;
                const duration = Number(p?.duration_days) || 30;
                const expectedReturn =
                    Number(p?.expected_return) && Number.isFinite(Number(p?.expected_return))
                        ? Number(p?.expected_return)
                        : investmentAmount * (1 + retPct / 100);

                const didActivate = await activateInvestmentAfterVerifiedPayment({
                    user_id: user.uid,
                    user_email: userProfile?.email || user?.email || "",
                    plan_id: planId!,
                    plan_name: planName!,
                    daily_roi_percent: Number(p?.daily_roi_percent) || 0,
                    return_percent: retPct,
                    amount: investmentAmount,
                    expected_return: expectedReturn,
                    duration_days: duration,
                    transaction_id: txKey,
                    proof_image_url: null,
                    wallet_address: adminAddr,
                    payment_method: "usdt_bep20_auto_verify",
                    notes: "Auto-verified BSC USDT (AutoVerifyPayment)",
                });

                if (didActivate) {
                    await insertRow("payment_verifications", {
                        user_id: user.uid,
                        user_email: userProfile?.email || user?.email,
                        user_name: userProfile?.display_name || user?.displayName,
                        amount: investmentAmount,
                        currency: "USDT",
                        purpose,
                        plan_id: planId || null,
                        plan_name: planName || null,
                        payment_method: "usdt_bep20",
                        wallet_address_used: adminAddr,
                        sender_wallet_address: sender,
                        transaction_hash: txKey,
                        blockchain_verified: true,
                        confirmations,
                        status: "verified",
                        submitted_at: new Date().toISOString(),
                        verified_at: new Date().toISOString(),
                        blockchain_data: verifiedTxData,
                    });
                }

                toast({
                    title: didActivate ? "Plan activated" : "Already active",
                    description: didActivate
                        ? `${planName} is now active. Your investment was recorded from the blockchain payment.`
                        : "This payment was already used to activate your plan.",
                });
            } else if (purpose === "deposit") {
                await insertRow("payment_verifications", {
                    user_id: user.uid,
                    user_email: userProfile?.email || user?.email,
                    user_name: userProfile?.display_name || user?.displayName,
                    amount: investmentAmount,
                    currency: "USDT",
                    purpose: "deposit",
                    plan_id: null,
                    plan_name: null,
                    payment_method: "usdt_bep20",
                    wallet_address_used: adminAddr,
                    sender_wallet_address: sender,
                    transaction_hash: txKey,
                    blockchain_verified: true,
                    confirmations,
                    status: "verified",
                    submitted_at: new Date().toISOString(),
                    verified_at: new Date().toISOString(),
                    blockchain_data: verifiedTxData,
                });

                await insertRow("transactions", {
                    user_id: user.uid,
                    user_email: userProfile?.email || user?.email,
                    user_display_name: userProfile?.display_name || user?.displayName,
                    type: "deposit",
                    amount: investmentAmount,
                    currency: "USDT",
                    status: "completed",
                    description: "Deposit — Auto-verified via blockchain",
                    transaction_hash: txKey,
                    blockchain_verified: true,
                    confirmations,
                    metadata: {
                        payment_method: "usdt_bep20",
                        sender_wallet: sender,
                        auto_verified: true,
                    },
                });

                await updateRow("users", user.uid, {
                    balance: (userProfile?.balance || 0) + investmentAmount,
                });

                toast({
                    title: "Payment Verified!",
                    description: `Wallet credited. ${confirmations} confirmations on-chain.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Missing plan",
                    description:
                        "Investment auto-verify requires a selected plan. Use the invest flow with plan context.",
                });
            }

            onVerified?.(verifiedTxData);
            onSuccess?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            toast({ variant: "destructive", title: "Error", description: message });
            setVerificationStep("failed");
        } finally {
            setIsSubmitting(false);
            completingRef.current = false;
        }
    }, [
        amount,
        adminAddr,
        confirmations,
        onSuccess,
        onVerified,
        planId,
        planName,
        purpose,
        toast,
        user,
        userProfile,
        verifiedTxData,
        txID,
    ]);

    confirmFnRef.current = handleConfirmationComplete;

    const copyWalletAddress = () => {
        if (!adminAddr) {
            toast({ title: "Error", description: "Wallet address not configured", variant: "destructive" });
            return;
        }
        navigator.clipboard.writeText(adminAddr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
    };

    const getStatusBadge = () => {
        switch (verificationStep) {
            case "verifying":
                return (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" /> Verifying...
                    </Badge>
                );
            case "confirming":
                return (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Confirming...
                    </Badge>
                );
            case "completed":
                return (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" /> Failed
                    </Badge>
                );
            default:
                return null;
        }
    };

    if (!walletReady) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                    Admin wallet address is not configured. Set NEXT_PUBLIC_BSC_ADMIN_WALLET_ADDRESS or
                    NEXT_PUBLIC_ADMIN_WALLET_ADDRESS (BEP20).
                </AlertDescription>
            </Alert>
        );
    }

    const hashValid = isValidTransactionHash(txID.trim());

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            Automatic Payment Verification
                        </CardTitle>
                        <CardDescription>
                            Send {amount} USDT (BEP20 on BSC) and paste the transaction hash (0x…)
                        </CardDescription>
                    </div>
                    {getStatusBadge()}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-muted rounded-lg p-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">Send USDT to this address</Label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all">
                            {adminAddr}
                        </code>
                        <Button variant="outline" size="icon" onClick={copyWalletAddress}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="text-sm text-muted-foreground">Amount Required</span>
                    <span className="text-2xl font-bold text-primary">${amount} USDT</span>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="txid">Transaction hash</Label>
                    <Input
                        id="txid"
                        placeholder="0x followed by 64 hex characters"
                        value={txID}
                        onChange={(e) => setTxID(e.target.value)}
                        disabled={verificationStep !== "idle" && verificationStep !== "failed"}
                        className="font-mono text-sm"
                        maxLength={66}
                        autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                        Verified on BNB Smart Chain via BscScan (auto when hash is complete).
                    </p>
                </div>

                {verificationStep === "verifying" && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            Verifying transaction on BNB Smart Chain…
                        </AlertDescription>
                    </Alert>
                )}

                {verificationStep === "confirming" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Confirmations</span>
                            <span className="font-medium">
                                {confirmations} / 19 {isChecking ? "…" : ""}
                            </span>
                        </div>
                        <Progress value={Math.min(100, (confirmations / 19) * 100)} className="h-2" />
                        <Alert className="bg-blue-50 border-blue-200">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                                Transaction found. Waiting for network confirmations…
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {verifyResult && !verifyResult.valid && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{verifyResult.error}</AlertDescription>
                    </Alert>
                )}

                {verificationStep === "completed" && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            Payment successfully verified and processed!
                        </AlertDescription>
                    </Alert>
                )}

                {hashValid && (
                    <a
                        href={`https://bscscan.com/tx/${txID.trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View on BscScan
                    </a>
                )}

                <div className="flex gap-3">
                    {verificationStep === "failed" && (
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                lastAutoTriggeredHash.current = null;
                                setVerificationStep("idle");
                                setTxID("");
                            }}
                        >
                            Try Again
                        </Button>
                    )}

                    {verificationStep === "idle" && (
                        <Button
                            className="flex-1"
                            onClick={() => void handleAutoVerify()}
                            disabled={!hashValid || isVerifying}
                        >
                            {isVerifying ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                                </>
                            ) : (
                                "Verify Payment"
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

"use client";

/**
 * Auto-Verify Payment Component with BEP20 Blockchain Integration
 * 
 * Features:
 * - Automatic TxID verification from blockchain
 * - USDT amount confirmation
 * - Confirmation status tracking
 * - Double spending prevention
 * - Real-time blockchain status updates
 */

import { useState, useEffect } from "react";
import { useUser, insertRow, updateRow } from "@/firebase";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { awardCommission, getReferralSettings } from "@/lib/referral-system";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    useTransactionVerification,
    useConfirmationTracker,
    useDoubleSpendCheck,
} from "@/hooks/use-bep20";
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

// Get safe version for internal usage
const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();

interface AutoVerifyPaymentProps {
    amount: number;
    purpose: 'deposit' | 'investment' | 'plan_activation';
    planId?: string;
    planName?: string;
    onSuccess?: () => void;
    onVerified?: (txData: any) => void;
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
    const [verificationStep, setVerificationStep] = useState<'idle' | 'verifying' | 'confirming' | 'completed' | 'failed'>('idle');
    const [copied, setCopied] = useState(false);
    const [verifiedTxData, setVerifiedTxData] = useState<any>(null);

    // Validate admin wallet is configured
    if (!isWalletConfigured()) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                    Admin wallet address is not configured. Please set NEXT_PUBLIC_ADMIN_WALLET_ADDRESS.
                </AlertDescription>
            </Alert>
        );
    }

    // Hooks for blockchain verification
    const { verify: verifyTx, isVerifying, result: verifyResult } = useTransactionVerification({
        expectedToAddress: ADMIN_WALLET_ADDRESS,
        expectedAmount: amount,
        minConfirmations: 19,
    });

    const { verify: checkDoubleSpend, result: doubleSpendResult } = useDoubleSpendCheck(
        ADMIN_WALLET_ADDRESS,
        amount
    );

    const {
        confirmations,
        confirmed,
        sufficient,
        isChecking,
        startTracking,
        stopTracking,
    } = useConfirmationTracker({
        pollInterval: 10000, // Check every 10 seconds
        minConfirmations: 19,
        onConfirmed: () => {
            handleConfirmationComplete();
        },
    });

    // Auto-verify when TxID is entered
    useEffect(() => {
        if (txID.length === 64 && verificationStep === 'idle') {
            handleAutoVerify();
        }
    }, [txID]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    const handleAutoVerify = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Please login first" });
            return;
        }

        setVerificationStep('verifying');

        // Step 1: Check for double spending
        await checkDoubleSpend(txID);

        if (doubleSpendResult?.alreadyProcessed) {
            toast({
                variant: "destructive",
                title: "Transaction Already Used",
                description: "This transaction has already been processed. Please use a different transaction."
            });
            setVerificationStep('failed');
            return;
        }

        // Step 2: Verify the transaction on blockchain
        await verifyTx(txID);
    };

    // Handle verification result
    useEffect(() => {
        if (!verifyResult) return;

        if (verifyResult.valid) {
            setVerifiedTxData(verifyResult.tx);

            if (verifyResult.sufficientConfirmations) {
                // Already has enough confirmations
                handleConfirmationComplete();
            } else {
                // Need to wait for more confirmations
                setVerificationStep('confirming');
                startTracking(txID);
            }
        } else {
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: verifyResult.error || "Could not verify transaction"
            });
            setVerificationStep('failed');
        }
    }, [verifyResult]);

    const handleConfirmationComplete = async () => {
        setVerificationStep('completed');

        try {
            setIsSubmitting(true);

            // Create payment record
            await insertRow('payment_verifications', {
                user_id: user?.uid,
                user_email: userProfile?.email || user?.email,
                user_name: userProfile?.display_name || user?.displayName,
                amount: verifiedTxData ? parseInt(verifiedTxData.quant) / 1e6 : amount,
                currency: 'USDT',
                purpose: purpose,
                plan_id: planId || null,
                plan_name: planName || null,
                payment_method: 'usdt_bep20',
                wallet_address_used: ADMIN_WALLET_ADDRESS,
                sender_wallet_address: verifiedTxData?.from_address,
                transaction_hash: txID,
                blockchain_verified: true,
                confirmations: confirmations,
                status: 'verified',
                submitted_at: new Date().toISOString(),
                verified_at: new Date().toISOString(),
                blockchain_data: verifiedTxData,
            });

            // Create transaction record with auto-approved status
            await insertRow('transactions', {
                user_id: user?.uid,
                user_email: userProfile?.email || user?.email,
                user_display_name: userProfile?.display_name || user?.displayName,
                type: purpose === 'deposit' ? 'deposit' : 'investment',
                amount: verifiedTxData ? parseInt(verifiedTxData.quant) / 1e6 : amount,
                currency: 'USDT',
                status: 'completed',
                description: `${purpose === 'deposit' ? 'Deposit' : 'Investment'} - Auto-verified via blockchain`,
                transaction_hash: txID,
                blockchain_verified: true,
                confirmations: confirmations,
                metadata: {
                    payment_method: 'usdt_bep20',
                    sender_wallet: verifiedTxData?.from_address,
                    auto_verified: true,
                },
            });

            // Update user balance for deposits
            if (purpose === 'deposit') {
                await updateRow('profiles', user?.uid || '', {
                    balance: (userProfile?.balance || 0) + (verifiedTxData ? parseInt(verifiedTxData.quant) / 1e6 : amount),
                });
            }

            // Automatically activate plan if purpose is plan_activation
            if (purpose === 'plan_activation' && planId && planName) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 30); // 30 days duration

                const investmentAmount = verifiedTxData ? parseInt(verifiedTxData.quant) / 1e6 : amount;
                const totalReturn = investmentAmount * 2; // Double return
                const dailyRoi = 0; // No daily ROI, all at end

                // Create user investment record
                await insertRow('user_investments', {
                    user_id: user?.uid,
                    plan_id: planId,
                    plan_name: planName,
                    amount: investmentAmount,
                    daily_roi: dailyRoi,
                    daily_roi_percent: 0,
                    total_return: totalReturn,
                    total_profit: investmentAmount,
                    earned_so_far: 0,
                    claimed_so_far: 0,
                    days_claimed: 0,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'active',
                    auto_compound: false,
                    capital_return: true,
                    blockchain_verified: true,
                    transaction_hash: txID,
                    activated_at: new Date().toISOString(),
                });

                // Distribute referral commissions up the chain
                if (db && user?.uid) {
                    try {
                        const settings = await getReferralSettings();
                        const commissionPercents = [
                            settings.level1_percent,
                            settings.level2_percent,
                            settings.level3_percent,
                            settings.level4_percent ?? 0,
                            settings.level5_percent ?? 0,
                        ];
                        const investorDoc = await getDoc(doc(db, 'users', user.uid));
                        if (investorDoc.exists()) {
                            let currentReferrerId = investorDoc.data().referrer_id;
                            let level = 0;
                            while (currentReferrerId && level < 5) {
                                const percent = commissionPercents[level] ?? 0;
                                if (percent > 0) {
                                    const commission = investmentAmount * (percent / 100);
                                    const referrerDoc = await getDoc(doc(db, 'users', currentReferrerId));
                                    if (referrerDoc.exists()) {
                                        await awardCommission(
                                            db,
                                            currentReferrerId,
                                            user.uid,
                                            investorDoc.data().username || user.email || '',
                                            commission,
                                            'investment',
                                            investmentAmount
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
                    title: "🎉 Plan Activated!",
                    description: `${planName} has been automatically activated. You will receive $${totalReturn} after 30 days.`,
                });
            } else {
                toast({
                    title: "Payment Verified!",
                    description: `Transaction verified on blockchain with ${confirmations} confirmations.`,
                });
            }

            onVerified?.(verifiedTxData);
            onSuccess?.();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyWalletAddress = () => {
        if (!ADMIN_WALLET_ADDRESS) {
            toast({ title: "Error", description: "Wallet address not configured", variant: "destructive" });
            return;
        }
        navigator.clipboard.writeText(ADMIN_WALLET_ADDRESS);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
    };

    const getStatusBadge = () => {
        switch (verificationStep) {
            case 'verifying':
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Verifying...</Badge>;
            case 'confirming':
                return <Badge variant="outline" className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Confirming...</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>;
            case 'failed':
                return <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            default:
                return null;
        }
    };

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            Automatic Payment Verification
                        </CardTitle>
                        <CardDescription>
                            Send {amount} USDT (TRC20) and enter the transaction ID
                        </CardDescription>
                    </div>
                    {getStatusBadge()}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Wallet Address Display */}
                <div className="bg-muted rounded-lg p-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                        Send USDT to this address
                    </Label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all">
                            {ADMIN_WALLET_ADDRESS}
                        </code>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={copyWalletAddress}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Amount Display */}
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <span className="text-sm text-muted-foreground">Amount Required</span>
                    <span className="text-2xl font-bold text-primary">${amount} USDT</span>
                </div>

                {/* Transaction ID Input */}
                <div className="space-y-2">
                    <Label htmlFor="txid">Transaction ID (TxID)</Label>
                    <Input
                        id="txid"
                        placeholder="Enter your transaction hash (64 characters)"
                        value={txID}
                        onChange={(e) => setTxID(e.target.value)}
                        disabled={verificationStep !== 'idle' && verificationStep !== 'failed'}
                        className="font-mono text-sm"
                        maxLength={64}
                    />
                    <p className="text-xs text-muted-foreground">
                        The TxID will be automatically verified on the blockchain
                    </p>
                </div>

                {/* Verification Progress */}
                {verificationStep === 'verifying' && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            Verifying transaction on BNB Smart Chain blockchain...
                        </AlertDescription>
                    </Alert>
                )}

                {/* Confirmation Progress */}
                {verificationStep === 'confirming' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Confirmations</span>
                            <span className="font-medium">{confirmations} / 19</span>
                        </div>
                        <Progress value={(confirmations / 19) * 100} className="h-2" />
                        <Alert className="bg-blue-50 border-blue-200">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                                Transaction verified! Waiting for network confirmations...
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Verification Result */}
                {verifyResult && !verifyResult.valid && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{verifyResult.error}</AlertDescription>
                    </Alert>
                )}

                {/* Success State */}
                {verificationStep === 'completed' && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            Payment successfully verified and processed!
                        </AlertDescription>
                    </Alert>
                )}

                {/* Blockchain Explorer Link */}
                {txID.length === 64 && (
                    <a
                        href={`https://bscscan.com/tx/${txID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View on BscScan
                    </a>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {verificationStep === 'failed' && (
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                setVerificationStep('idle');
                                setTxID("");
                            }}
                        >
                            Try Again
                        </Button>
                    )}

                    {verificationStep === 'idle' && (
                        <Button
                            className="flex-1"
                            onClick={handleAutoVerify}
                            disabled={txID.length !== 64 || isVerifying}
                        >
                            {isVerifying ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
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

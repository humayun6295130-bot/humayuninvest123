"use client";

import { useState } from "react";
import { useUser, insertRow, useRealtimeCollection, fetchRows, updateRow, incrementBalance } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Wallet,
    Upload,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Check,
    QrCode,
    FileImage,
    X,
    ExternalLink,
    ShieldCheck,
    Info
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { getAdminWalletAddress, WALLET_ADDRESSES, generateBEP20QRCode, generateGenericQRCode } from "@/lib/wallet-config";
import { verifyTransactionWithDoubleSpendCheck } from "@/lib/bep20";

// Get safe version for internal usage
const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();

interface PaymentVerificationProps {
    amount: number;
    purpose: 'deposit' | 'investment' | 'plan_activation';
    planId?: string;
    planName?: string;
    onSuccess?: () => void;
}

export function PaymentVerificationSystem({
    amount,
    purpose,
    planId,
    planName,
    onSuccess
}: PaymentVerificationProps) {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [step, setStep] = useState<'select_method' | 'show_qr' | 'submit_proof' | 'pending' | 'success'>('select_method');
    const [selectedMethod, setSelectedMethod] = useState<string>('');
    const [transactionHash, setTransactionHash] = useState('');
    const [senderWallet, setSenderWallet] = useState('');
    const [notes, setNotes] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        toast({ title: "Copied!", description: "Address copied to clipboard" });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ variant: "destructive", title: "Invalid File", description: "Please upload an image file" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: "destructive", title: "File Too Large", description: "Maximum size is 5MB" });
            return;
        }

        setScreenshot(file);
        const reader = new FileReader();
        reader.onloadend = () => setScreenshotPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const removeScreenshot = () => {
        setScreenshot(null);
        setScreenshotPreview(null);
    };

    const handleSubmitProof = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Please login first" });
            return;
        }

        if (!transactionHash.trim()) {
            toast({ variant: "destructive", title: "Required", description: "Please enter transaction hash" });
            return;
        }

        if (!senderWallet.trim()) {
            toast({ variant: "destructive", title: "Required", description: "Please enter your wallet address" });
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload screenshot if provided
            let screenshotUrl = '';
            if (screenshot) {
                const formData = new FormData();
                formData.append('file', screenshot);
                // Note: In production, implement proper file upload
                screenshotUrl = URL.createObjectURL(screenshot);
            }

            // Create payment verification record
            const verification = await insertRow('payment_verifications', {
                user_id: user.uid,
                user_email: userProfile?.email || user.email,
                user_name: userProfile?.display_name || user.displayName,
                amount: amount,
                currency: selectedMethod.includes('usdt') ? 'USDT' : selectedMethod.toUpperCase(),
                purpose: purpose,
                plan_id: planId || null,
                plan_name: planName || null,
                payment_method: selectedMethod,
                wallet_address_used: WALLET_ADDRESSES[selectedMethod as keyof typeof WALLET_ADDRESSES],
                sender_wallet_address: senderWallet,
                transaction_hash: transactionHash,
                screenshot_url: screenshotUrl,
                notes: notes,
                status: 'pending_verification',
                submitted_at: new Date().toISOString(),
                verification_status: 'pending',
            });

            // Also create a transaction record
            const tx = await insertRow('transactions', {
                user_id: user.uid,
                user_email: userProfile?.email || user.email,
                user_display_name: userProfile?.display_name || user.displayName,
                type: purpose === 'deposit' ? 'deposit' : 'investment',
                amount: amount,
                currency: selectedMethod.includes('usdt') ? 'USDT' : selectedMethod.toUpperCase(),
                status: 'pending',
                description: `${purpose === 'deposit' ? 'Deposit' : 'Investment'} request - awaiting verification`,
                transaction_hash: transactionHash,
                metadata: {
                    payment_method: selectedMethod,
                    sender_wallet: senderWallet,
                    verification_required: true,
                },
            });

            // Try on-chain verification + auto-approval (especially for deposits)
            try {
                const toAddress = WALLET_ADDRESSES[selectedMethod as keyof typeof WALLET_ADDRESSES] || ADMIN_WALLET_ADDRESS;
                const chainCheck = await verifyTransactionWithDoubleSpendCheck(
                    transactionHash,
                    toAddress,
                    amount
                );

                if (chainCheck.valid && chainCheck.confirmed && !chainCheck.alreadyProcessed) {
                    // Mark payment verification as approved / blockchain_verified
                    await updateRow('payment_verifications', verification.id, {
                        status: 'approved',
                        blockchain_verified: true,
                        confirmations: chainCheck.confirmations,
                        verified_at: new Date().toISOString(),
                        verification_status: 'approved',
                    });

                    // Mark transaction as completed if still pending
                    await updateRow('transactions', tx.id, {
                        status: 'completed',
                        blockchain_verified: true,
                        confirmations: chainCheck.confirmations,
                    });

                    // For pure deposits, credit wallet balance immediately
                    if (purpose === 'deposit') {
                        await incrementBalance(user.uid, amount);
                    }
                }
            } catch (chainErr) {
                console.error('Auto on-chain verification (non-fatal):', chainErr);
                // Keep records pending for manual review
            }

            toast({
                title: "Payment Proof Submitted!",
                description:
                    purpose === 'deposit'
                        ? "Your payment has been submitted. If blockchain verification passes, your balance will be credited automatically, otherwise an admin will review it."
                        : "Your payment is under review. You'll be notified once verified.",
            });

            setStep('success');
            onSuccess?.();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const paymentMethods = [
        { id: 'usdt_bep20', name: 'USDT (BEP20)', icon: '💎', color: 'bg-amber-500', network: 'BNB Smart Chain' },
        { id: 'usdt_erc20', name: 'USDT (ERC20)', icon: '💎', color: 'bg-blue-500', network: 'Ethereum' },
        { id: 'btc', name: 'Bitcoin', icon: '₿', color: 'bg-orange-500', network: 'Bitcoin' },
        { id: 'eth', name: 'Ethereum', icon: 'Ξ', color: 'bg-purple-500', network: 'Ethereum' },
        { id: 'bnb', name: 'BNB', icon: '🔶', color: 'bg-yellow-500', network: 'BSC' },
    ];

    if (step === 'success') {
        return (
            <Card className="border-green-500/50 bg-green-50/50">
                <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">Payment Submitted!</h3>
                    <p className="text-green-700 mb-4">
                        Your payment proof has been submitted and is under review.
                    </p>
                    <div className="bg-white rounded-lg p-4 mb-4 text-left">
                        <p className="text-sm text-muted-foreground mb-1">Transaction Hash:</p>
                        <code className="text-xs font-mono break-all">{transactionHash}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        You'll receive a notification once your payment is verified.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
                {['Select Method', 'Payment', 'Submit Proof'].map((label, index) => {
                    const stepIndex = ['select_method', 'show_qr', 'submit_proof'].indexOf(step);
                    const isActive = index <= stepIndex;
                    return (
                        <div key={label} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                {index + 1}
                            </div>
                            <span className={`ml-2 text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {label}
                            </span>
                            {index < 2 && <div className="w-8 h-0.5 mx-2 bg-muted" />}
                        </div>
                    );
                })}
            </div>

            {step === 'select_method' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Payment Method</CardTitle>
                        <CardDescription>Choose your preferred cryptocurrency</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {paymentMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => {
                                        setSelectedMethod(method.id);
                                        setStep('show_qr');
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md text-left ${selectedMethod === method.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg ${method.color} text-white flex items-center justify-center text-xl mb-3`}>
                                        {method.icon}
                                    </div>
                                    <p className="font-semibold text-sm">{method.name}</p>
                                    <p className="text-xs text-muted-foreground">{method.network}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'show_qr' && selectedMethod && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5" />
                            Send Payment
                        </CardTitle>
                        <CardDescription>
                            Send exactly <strong className="text-primary">${amount}</strong> worth of {paymentMethods.find(m => m.id === selectedMethod)?.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Warning */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-semibold mb-1">Important:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Send only {paymentMethods.find(m => m.id === selectedMethod)?.name}</li>
                                    <li>Use only {paymentMethods.find(m => m.id === selectedMethod)?.network} network</li>
                                    <li>Minimum amount: ${amount}</li>
                                </ul>
                            </div>
                        </div>

                        {/* Wallet Address */}
                        <div className="bg-muted rounded-xl p-6">
                            <Label className="text-center block mb-4">Send to this address</Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-3 bg-background rounded-lg text-xs font-mono break-all">
                                    {WALLET_ADDRESSES[selectedMethod as keyof typeof WALLET_ADDRESSES]}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(WALLET_ADDRESSES[selectedMethod as keyof typeof WALLET_ADDRESSES], 'address')}
                                >
                                    {copiedField === 'address' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* QR Code Placeholder */}
                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                                    <QrCode className="w-24 h-24 text-muted-foreground/50" />
                                </div>
                                <p className="text-center text-xs text-muted-foreground mt-2">Scan with your wallet</p>
                            </div>
                        </div>

                        <Button onClick={() => setStep('submit_proof')} className="w-full">
                            I've Sent the Payment
                        </Button>
                    </CardContent>
                </Card>
            )}

            {step === 'submit_proof' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            Verify Payment
                        </CardTitle>
                        <CardDescription>
                            Provide proof of your payment for verification
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="txHash">
                                Transaction Hash / TXID <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="txHash"
                                placeholder="Paste your transaction hash here"
                                value={transactionHash}
                                onChange={(e) => setTransactionHash(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                You can find this in your wallet's transaction history
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="senderWallet">
                                Your Wallet Address <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="senderWallet"
                                placeholder="Enter the wallet address you sent from"
                                value={senderWallet}
                                onChange={(e) => setSenderWallet(e.target.value)}
                            />
                        </div>

                        {/* Screenshot Upload */}
                        <div className="space-y-2">
                            <Label>Payment Screenshot (Optional but recommended)</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${screenshotPreview ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                    }`}
                                onClick={() => document.getElementById('screenshot')?.click()}
                            >
                                <input
                                    type="file"
                                    id="screenshot"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {screenshotPreview ? (
                                    <div className="relative">
                                        <img src={screenshotPreview} alt="Payment proof" className="max-h-48 mx-auto rounded-lg" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeScreenshot();
                                            }}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <FileImage className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm font-medium">Click to upload screenshot</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Additional Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Any additional information about this payment"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-20"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep('show_qr')} className="flex-1">
                                Back
                            </Button>
                            <Button
                                onClick={handleSubmitProof}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Admin Verification Component
export function AdminPaymentVerification() {
    const { data: pendingPayments, isLoading } = useRealtimeCollection({
        table: 'payment_verifications',
        filters: [{ column: 'status', operator: '==', value: 'pending_verification' }],
        orderByColumn: { column: 'submitted_at', direction: 'desc' },
        enabled: true,
    });

    const handleVerify = async (paymentId: string, action: 'approve' | 'reject') => {
        // Implementation for admin verification
        // Update payment status, credit user balance, etc.
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Verifications</CardTitle>
                <CardDescription>Review and verify user payments</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Admin verification table */}
            </CardContent>
        </Card>
    );
}

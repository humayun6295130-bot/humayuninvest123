"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { fetchRows, useUser } from "@/firebase";
import { activateInvestmentAfterVerifiedPayment } from "@/lib/activate-qr-investment";
import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    Wallet,
    Copy,
    CheckCircle,
    AlertCircle,
    Clock,
    QrCode,
    Upload,
    Image as ImageIcon,
    X,
} from "lucide-react";
import Image from "next/image";
import { getAdminWalletAddress, generateBEP20QRCode, getWalletInfo } from "@/lib/wallet-config";

// Get safe version for internal usage
const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();

interface InvestmentPlan {
    id: string;
    name: string;
    fixed_amount?: number;
    min_amount: number;
    max_amount: number;
    duration_days: number;
    return_percent: number;
    total_return?: number;
}

interface QrPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: InvestmentPlan | null;
    userId: string;
    userEmail?: string;
    customAmount?: number;
}

export function QrPaymentDialog({
    open,
    onOpenChange,
    plan,
    userId,
    userEmail,
    customAmount
}: QrPaymentDialogProps) {
    const { toast } = useToast();
    const { user } = useUser();
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transactionId, setTransactionId] = useState("");
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const walletInfo = getWalletInfo();

    const investmentAmount = customAmount || plan?.fixed_amount || plan?.min_amount || 0;
    const expectedReturn = plan?.total_return || investmentAmount * 2;

    const copyWalletAddress = () => {
        if (!ADMIN_WALLET_ADDRESS) {
            toast({ title: "Error", description: "Wallet address not configured", variant: "destructive" });
            return;
        }
        navigator.clipboard.writeText(ADMIN_WALLET_ADDRESS);
        setCopied(true);
        toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({ variant: "destructive", title: "Invalid File", description: "Please upload an image file (PNG, JPG, JPEG)" });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: "destructive", title: "File Too Large", description: "Maximum file size is 5MB" });
            return;
        }

        setScreenshot(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setScreenshotPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeScreenshot = () => {
        setScreenshot(null);
        setScreenshotPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadScreenshot = async (): Promise<string | null> => {
        if (!screenshot || !userId || !storage) return null;

        try {
            const timestamp = Date.now();
            const fileName = `payment_proofs/${userId}/${timestamp}_${screenshot.name}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, screenshot);
            const downloadUrl = await getDownloadURL(storageRef);

            return downloadUrl;
        } catch (error: any) {
            console.error("Upload error:", error);
            throw new Error("Failed to upload screenshot: " + error.message);
        }
    };

    const handleConfirmPayment = async () => {
        if (!plan || !userId) return;

        const rawTx = transactionId.trim().replace(/\s+/g, "");
        if (!rawTx) {
            toast({ variant: "destructive", title: "Transaction ID Required", description: "Please enter the transaction hash/ID from your payment" });
            return;
        }

        if (!/^0x[a-fA-F0-9]{64}$/.test(rawTx)) {
            toast({
                variant: "destructive",
                title: "Invalid transaction hash",
                description: "Use a full BSC transaction hash (0x + 64 hex characters).",
            });
            return;
        }

        const amt = Number(investmentAmount);
        if (!Number.isFinite(amt) || amt <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid amount",
                description: "Investment amount is missing or invalid for this plan.",
            });
            return;
        }

        if (!ADMIN_WALLET_ADDRESS) {
            toast({ variant: "destructive", title: "Configuration Error", description: "Platform wallet address is not configured." });
            return;
        }

        const email = (userEmail?.trim() || user?.email || "").trim();
        if (!email) {
            toast({ variant: "destructive", title: "Email required", description: "Your account has no email on file. Update your profile or re-login with email." });
            return;
        }

        const txNorm = rawTx;
        const txLower = txNorm.toLowerCase();

        setIsSubmitting(true);
        try {
            const [pendingDup, txDup] = await Promise.all([
                fetchRows<{ transaction_id?: string }>("pending_investments", {
                    filters: [{ column: "transaction_id", operator: "==", value: txLower }],
                }),
                fetchRows<{ transaction_hash?: string }>("transactions", {
                    filters: [{ column: "transaction_hash", operator: "==", value: txLower }],
                }),
            ]);
            if (pendingDup.length > 0 || txDup.length > 0) {
                toast({
                    variant: "destructive",
                    title: "Transaction already used",
                    description: "This transaction hash has already been used for a payment.",
                });
                return;
            }

            toast({ title: "Verifying payment...", description: "Checking your USDT transfer on BNB Smart Chain." });
            const verifyRes = await fetch("/api/invest/verify-bsc-usdt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    txHash: txNorm,
                    expectedRecipient: ADMIN_WALLET_ADDRESS,
                    expectedAmount: amt,
                    minConfirmations: 3,
                }),
            });

            let verifyJson: { valid?: boolean; error?: string } = {};
            try {
                verifyJson = await verifyRes.json();
            } catch {
                toast({
                    variant: "destructive",
                    title: "Verification failed",
                    description: "Could not read server response. Check your connection and try again.",
                });
                return;
            }

            if (!verifyRes.ok || !verifyJson.valid) {
                toast({
                    variant: "destructive",
                    title: "Verification failed",
                    description:
                        verifyJson.error ||
                        (verifyRes.status === 501
                            ? "Payment verification is not configured on the server (API key missing)."
                            : "Could not confirm this USDT payment on-chain."),
                });
                return;
            }

            let screenshotUrl: string | null = null;
            if (screenshot) {
                toast({ title: "Uploading proof...", description: "Saving your screenshot." });
                screenshotUrl = await uploadScreenshot();
            }

            await activateInvestmentAfterVerifiedPayment({
                user_id: userId,
                user_email: email,
                plan_id: plan.id,
                plan_name: plan.name,
                amount: amt,
                expected_return: expectedReturn,
                duration_days: plan.duration_days > 0 ? plan.duration_days : 30,
                transaction_id: txLower,
                proof_image_url: screenshotUrl,
                wallet_address: ADMIN_WALLET_ADDRESS,
            });

            toast({
                title: "Plan activated",
                description: "Your USDT payment was verified and your investment is now active.",
            });

            setTransactionId("");
            setScreenshot(null);
            setScreenshotPreview(null);
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to complete activation",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-slate-900 border-orange-500/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-400">
                        <Wallet className="h-5 w-5" />
                        Complete Your Investment
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Send USDT (BEP20), then submit your tx hash—we verify on-chain and activate {plan.name} automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Investment Summary */}
                    <Card className="bg-slate-800 border-orange-500/20">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400">Plan</span>
                                <span className="font-semibold text-white">{plan.name}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400">Investment</span>
                                <span className="font-bold text-lg text-orange-400">${investmentAmount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">You Will Receive</span>
                                <span className="font-bold text-green-400 text-lg">${expectedReturn}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Info */}
                    <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <p className="text-sm text-slate-400 mb-1">Send Exactly</p>
                        <p className="text-2xl font-bold text-orange-400">{investmentAmount} USDT</p>
                        <p className="text-xs text-slate-400 mt-1">Network: {walletInfo.network}</p>
                        <Badge variant="outline" className="mt-2 bg-orange-500/20 text-orange-400 border-orange-500/30">
                            Automatic Verification Enabled
                        </Badge>
                    </div>

                    {/* QR Code Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2 text-orange-400">
                                <QrCode className="h-4 w-4" />
                                Scan QR Code
                            </h4>
                            <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                                {walletInfo.network}
                            </Badge>
                        </div>

                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-orange-300 shadow-sm">
                                <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center relative overflow-hidden bg-white">
                                    <img
                                        src={ADMIN_WALLET_ADDRESS ? generateBEP20QRCode(investmentAmount) : ''}
                                        alt="Payment QR Code"
                                        className="w-full h-full object-contain rounded-lg"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                                parent.innerHTML = `
                                                    <div class="flex flex-col items-center justify-center w-full h-full bg-gray-50 rounded-lg">
                                                        <svg class="w-16 h-16 text-gray-300 mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                                                        <p class="text-xs text-gray-400 text-center px-2">QR Code Loading...</p>
                                                    </div>
                                                `;
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-center text-slate-500 mt-2">
                                    {walletInfo.scanInstructions}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-300">Or Send To Wallet Address</h4>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-slate-800 p-3 rounded-lg text-xs break-all font-mono text-orange-300 border border-slate-700">
                                {ADMIN_WALLET_ADDRESS}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyWalletAddress}
                                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                            >
                                {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Payment Proof Section */}
                    <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-4 space-y-4">
                            <h4 className="font-medium flex items-center gap-2 text-sm text-yellow-400">
                                <Upload className="h-4 w-4" />
                                Payment Proof
                            </h4>

                            {/* Transaction ID */}
                            <div className="space-y-2">
                                <Label htmlFor="transactionId" className="text-sm text-slate-300">
                                    Transaction ID / Hash <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="transactionId"
                                    placeholder="Enter transaction hash from your wallet"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="font-mono text-sm bg-slate-800 border-slate-700 text-white"
                                />
                                <p className="text-xs text-slate-500">
                                    You can find this in your wallet's transaction history
                                </p>
                            </div>

                            {/* Screenshot Upload - Optional */}
                            <div className="space-y-2">
                                <Label className="text-sm text-slate-300">
                                    Screenshot Proof <span className="text-slate-500">(Optional)</span>
                                </Label>

                                {!screenshotPreview ? (
                                    <div
                                        className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-800/50 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                                        <p className="text-sm text-slate-400">Click to upload screenshot (Optional)</p>
                                        <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-700">
                                            <Image
                                                src={screenshotPreview}
                                                alt="Payment proof"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-8 w-8"
                                            onClick={removeScreenshot}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card className="bg-blue-500/5 border-blue-500/20">
                        <CardContent className="p-4 space-y-2">
                            <h4 className="font-medium flex items-center gap-2 text-sm text-blue-400">
                                <AlertCircle className="h-4 w-4" />
                                Instructions
                            </h4>
                            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                                <li>Send the exact USDT amount to the wallet above (BNB Smart Chain / BEP20)</li>
                                <li>Wait for a few block confirmations (usually 1–3 minutes)</li>
                                <li>Paste the transaction hash and tap Verify—no admin approval needed</li>
                                <li>Optional: attach a screenshot for your own records</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmPayment}
                        disabled={isSubmitting || !transactionId.trim()}
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
                    >
                        {isSubmitting ? (
                            <><Clock className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                        ) : (
                            <><CheckCircle className="mr-2 h-4 w-4" /> Verify & Activate Plan</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

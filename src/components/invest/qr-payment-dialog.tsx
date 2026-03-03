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
// Note: Tabs removed - USDT TRC-20 is the only payment method
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertRow } from "@/firebase";
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
    FileImage
} from "lucide-react";
import Image from "next/image";

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
}

// TRON TRC-20 USDT Wallet Address
const WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '';

// QR Code Generation URL (using QRServer API)
const generateQRCodeURL = (address: string, amount: number) => {
    const paymentData = `tron://transfer?to=${address}&amount=${amount}&token=USDT`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData)}`;
};

export function QrPaymentDialog({
    open,
    onOpenChange,
    plan,
    userId,
    userEmail
}: QrPaymentDialogProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transactionId, setTransactionId] = useState("");
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const investmentAmount = plan?.fixed_amount || plan?.min_amount || 0;
    const expectedReturn = plan?.total_return || investmentAmount * 2;

    const copyWalletAddress = () => {
        if (!WALLET_ADDRESS) {
            toast({ title: "Error", description: "Wallet address not configured", variant: "destructive" });
            return;
        }
        navigator.clipboard.writeText(WALLET_ADDRESS);
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

        // Validation
        if (!transactionId.trim()) {
            toast({ variant: "destructive", title: "Transaction ID Required", description: "Please enter the transaction hash/ID from your payment" });
            return;
        }

        // Screenshot is optional - only Transaction ID is mandatory

        setIsSubmitting(true);
        try {
            // Upload screenshot if provided (optional)
            let screenshotUrl = null;
            if (screenshot) {
                toast({ title: "Uploading proof...", description: "Please wait while we upload your screenshot" });
                screenshotUrl = await uploadScreenshot();
            }

            // Create pending investment record
            await insertRow('pending_investments', {
                user_id: userId,
                user_email: userEmail,
                plan_id: plan.id,
                plan_name: plan.name,
                amount: investmentAmount,
                expected_return: expectedReturn,
                wallet_address: WALLET_ADDRESS,
                status: 'pending_payment_confirmation',
                payment_method: 'usdt_trc20',
                transaction_id: transactionId.trim(),
                proof_image_url: screenshotUrl,
                created_at: new Date().toISOString(),
            });

            toast({
                title: "Payment Proof Submitted! ✅",
                description: "Admin will verify your payment and activate your plan within 24 hours.",
            });

            // Reset form
            setTransactionId("");
            setScreenshot(null);
            setScreenshotPreview(null);
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to submit payment proof",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Complete Your Investment
                    </DialogTitle>
                    <DialogDescription>
                        Send payment and submit proof to activate your {plan.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Investment Summary */}
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground">Plan</span>
                                <span className="font-semibold">{plan.name}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground">Investment</span>
                                <span className="font-bold text-lg">${investmentAmount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">You Will Receive</span>
                                <span className="font-bold text-green-600 text-lg">${expectedReturn}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Info */}
                    <div className="text-center p-4 bg-blue-500/5 rounded-lg border border-blue-200">
                        <p className="text-sm text-muted-foreground mb-1">Send Exactly</p>
                        <p className="text-2xl font-bold text-blue-600">{investmentAmount} USDT</p>
                        <p className="text-xs text-muted-foreground mt-1">Network: TRC20 (TRON)</p>
                        <Badge variant="outline" className="mt-2 bg-blue-50">Automatic Verification Enabled</Badge>
                    </div>

                    {/* QR Code Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                                <QrCode className="h-4 w-4" />
                                Scan QR Code
                            </h4>
                            <Badge variant="outline" className="text-xs">USDT TRC-20</Badge>
                        </div>

                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-primary/30 shadow-sm">
                                {/* QR Code Image - Using img tag for better compatibility */}
                                <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center relative overflow-hidden bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={WALLET_ADDRESS ? generateQRCodeURL(WALLET_ADDRESS, investmentAmount) : ''}
                                        alt="Payment QR Code"
                                        className="w-full h-full object-contain rounded-lg"
                                        onError={(e) => {
                                            // If image fails to load, show placeholder
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
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    Scan with your crypto wallet
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Or Send To Wallet Address</h4>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-muted p-3 rounded-lg text-xs break-all font-mono">
                                {WALLET_ADDRESS}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyWalletAddress}
                            >
                                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Payment Proof Section */}
                    <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-4 space-y-4">
                            <h4 className="font-medium flex items-center gap-2 text-sm">
                                <Upload className="h-4 w-4 text-yellow-600" />
                                Payment Proof
                            </h4>

                            {/* Transaction ID */}
                            <div className="space-y-2">
                                <Label htmlFor="transactionId" className="text-sm">
                                    Transaction ID / Hash <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="transactionId"
                                    placeholder="Enter transaction hash from your wallet"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    You can find this in your wallet's transaction history
                                </p>
                            </div>

                            {/* Screenshot Upload - Optional */}
                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Screenshot Proof <span className="text-muted-foreground">(Optional)</span>
                                </Label>

                                {!screenshotPreview ? (
                                    <div
                                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Click to upload screenshot (Optional)</p>
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
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
                            <h4 className="font-medium flex items-center gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                Instructions
                            </h4>
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Send exact amount to the wallet address above</li>
                                <li>Copy the Transaction ID from your wallet</li>
                                <li>Take a screenshot of the successful payment</li>
                                <li>Submit both Transaction ID and Screenshot</li>
                                <li>Admin will verify and activate within 24 hours</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmPayment}
                        disabled={isSubmitting || !transactionId.trim()}
                        className="w-full sm:w-auto"
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

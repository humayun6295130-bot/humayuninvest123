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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const WALLET_ADDRESS = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";

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
    const [paymentMethod, setPaymentMethod] = useState<'eth' | 'usdt'>('usdt');
    const [transactionId, setTransactionId] = useState("");
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const investmentAmount = plan?.fixed_amount || plan?.min_amount || 0;
    const expectedReturn = plan?.total_return || investmentAmount * 2;

    const copyWalletAddress = () => {
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

        if (!screenshot) {
            toast({ variant: "destructive", title: "Screenshot Required", description: "Please upload a screenshot of your payment as proof" });
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload screenshot first
            toast({ title: "Uploading proof...", description: "Please wait while we upload your screenshot" });
            const screenshotUrl = await uploadScreenshot();

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
                payment_method: paymentMethod,
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

                    {/* Payment Method Tabs */}
                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'eth' | 'usdt')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="usdt">USDT (TRC20)</TabsTrigger>
                            <TabsTrigger value="eth">ETH / BNB</TabsTrigger>
                        </TabsList>

                        <TabsContent value="usdt" className="space-y-4">
                            <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Send Exactly</p>
                                <p className="text-2xl font-bold text-blue-600">{investmentAmount} USDT</p>
                                <p className="text-xs text-muted-foreground mt-1">Network: TRC20 (Tron)</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="eth" className="space-y-4">
                            <div className="text-center p-4 bg-purple-500/5 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Send Equivalent of</p>
                                <p className="text-2xl font-bold text-purple-600">${investmentAmount}</p>
                                <p className="text-xs text-muted-foreground mt-1">In ETH or BNB</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* QR Code Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                                <QrCode className="h-4 w-4" />
                                Scan QR Code
                            </h4>
                            <Badge variant="outline" className="text-xs">Crypto Payment</Badge>
                        </div>

                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed">
                                {/* QR Code Placeholder */}
                                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <QrCode className="w-32 h-32 text-foreground opacity-20" />
                                    </div>
                                    <div className="text-center z-10">
                                        <p className="text-xs text-muted-foreground">QR Code</p>
                                        <p className="text-[10px] text-muted-foreground">Replace with actual image</p>
                                    </div>
                                </div>
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
                                Payment Proof (Required)
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

                            {/* Screenshot Upload */}
                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Screenshot Proof <span className="text-red-500">*</span>
                                </Label>

                                {!screenshotPreview ? (
                                    <div
                                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
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
                        disabled={isSubmitting || !transactionId.trim() || !screenshot}
                        className="w-full sm:w-auto"
                    >
                        {isSubmitting ? (
                            <><Clock className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                            <><CheckCircle className="mr-2 h-4 w-4" /> Submit Payment Proof</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

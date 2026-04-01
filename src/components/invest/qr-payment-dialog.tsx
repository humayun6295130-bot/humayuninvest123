"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
    RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { generateGenericQRCode, getWalletInfo } from "@/lib/wallet-config";
import { isPaymentStatusComplete } from "@/lib/nowpayments-shared";
import { resolveDailyIncomeForDeposit } from "@/lib/deposit-income-tiers";
import { buildInvestmentOrderId } from "@/lib/investment-order-id";

const POLL_MS = 10_000;

export interface InvestmentPlan {
    id: string;
    name: string;
    fixed_amount?: number;
    min_amount: number;
    max_amount: number;
    duration_days: number;
    return_percent: number;
    daily_roi_percent: number;
    /** If set and large enough, treated as total USD payout (principal + profit) for this payment */
    total_return?: number;
    /** Default true: expected payout includes principal back */
    capital_return?: boolean;
}

/** Total USD user should see credited at term (for Firestore), independent of marketing label */
export function computeExpectedReturnUsd(plan: InvestmentPlan | null, amount: number): number {
    if (!plan || !Number.isFinite(amount) || amount <= 0) return 0;
    const tr = plan.total_return;
    if (typeof tr === "number" && Number.isFinite(tr) && tr >= amount * 0.5) {
        return tr;
    }
    const dur = Number(plan.duration_days) || 30;
    const capital = plan.capital_return !== false;
    const tiered = resolveDailyIncomeForDeposit(amount);
    if (tiered.dailyUsd > 0 && dur > 0) {
        const profit = tiered.dailyUsd * dur;
        return profit + (capital ? amount : 0);
    }
    const retPct = Number(plan.return_percent) || 0;
    if (retPct > 0) {
        const profit = amount * (retPct / 100);
        return profit + (capital ? amount : 0);
    }
    return amount * 2;
}

interface QrPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: InvestmentPlan | null;
    userId: string;
    userEmail?: string;
    customAmount?: number;
}

type NpTerminal = "ok" | "fail" | null;

export function QrPaymentDialog({
    open,
    onOpenChange,
    plan,
    userId,
    userEmail,
    customAmount,
}: QrPaymentDialogProps) {
    const { toast } = useToast();
    const { user } = useUser();
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [npPaymentId, setNpPaymentId] = useState<number | null>(null);
    const [orderId, setOrderId] = useState("");
    const [payAddress, setPayAddress] = useState("");
    const [payAmount, setPayAmount] = useState<number | null>(null);
    const [payCurrency, setPayCurrency] = useState<string>("");
    const [pollStatus, setPollStatus] = useState<string>("");
    const [terminal, setTerminal] = useState<NpTerminal>(null);
    const [orderCopied, setOrderCopied] = useState(false);

    const activatedRef = useRef(false);
    const finalizeRef = useRef<() => Promise<void>>(async () => {});
    const walletInfo = getWalletInfo();

    const investmentAmount = customAmount || plan?.fixed_amount || plan?.min_amount || 0;
    const expectedReturn = useMemo(
        () => computeExpectedReturnUsd(plan, investmentAmount),
        [plan, investmentAmount]
    );

    const copyWalletAddress = () => {
        if (!payAddress) {
            toast({ title: "Error", description: "Address not ready yet", variant: "destructive" });
            return;
        }
        navigator.clipboard.writeText(payAddress);
        setCopied(true);
        toast({ title: "Copied!", description: "Deposit address copied" });
        setTimeout(() => setCopied(false), 2000);
    };

    const copyOrderId = () => {
        if (!orderId) {
            toast({ title: "Error", description: "Order ID not ready yet", variant: "destructive" });
            return;
        }
        navigator.clipboard.writeText(orderId);
        setOrderCopied(true);
        toast({ title: "Copied", description: "Order ID copied" });
        setTimeout(() => setOrderCopied(false), 2000);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({
                variant: "destructive",
                title: "Invalid File",
                description: "Please upload an image file (PNG, JPG, JPEG)",
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: "destructive", title: "File Too Large", description: "Maximum file size is 5MB" });
            return;
        }

        setScreenshot(file);

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
            fileInputRef.current.value = "";
        }
    };

    const uploadScreenshot = async (): Promise<string | null> => {
        if (!screenshot || !userId || !storage) return null;

        try {
            const timestamp = Date.now();
            const fileName = `payment_proofs/${userId}/${timestamp}_${screenshot.name}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, screenshot);
            return await getDownloadURL(storageRef);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Upload failed";
            throw new Error("Failed to upload screenshot: " + message);
        }
    };

    /** Create NOWPayments invoice when dialog opens */
    useEffect(() => {
        if (!open || !plan || !userId) return;

        let cancelled = false;
        activatedRef.current = false;
        setTerminal(null);
        setCreateError(null);
        setNpPaymentId(null);
        setPayAddress("");
        setPayAmount(null);
        setPayCurrency("");
        setPollStatus("");

        const amt = Number(investmentAmount);
        if (!Number.isFinite(amt) || amt <= 0) {
            setCreateError("Invalid investment amount.");
            setOrderId("");
            return;
        }

        const prebuiltOrderId = buildInvestmentOrderId(userId, plan!.id);
        setOrderId(prebuiltOrderId);

        async function create() {
            setIsCreating(true);
            try {
                const res = await fetch("/api/nowpayments/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        priceAmount: amt,
                        planId: plan!.id,
                        planName: plan!.name,
                        userId,
                        order_id: prebuiltOrderId,
                    }),
                });
                const j = (await res.json().catch(() => ({}))) as {
                    error?: string;
                    payment_id?: number | string;
                    order_id?: string;
                    pay_address?: string;
                    pay_amount?: number | string;
                    pay_currency?: string;
                    payment_status?: string;
                };
                if (cancelled) return;
                const parsedPaymentId =
                    j.payment_id == null ? null : Number(typeof j.payment_id === "string" ? j.payment_id.trim() : j.payment_id);

                if (!res.ok || parsedPaymentId == null || !Number.isFinite(parsedPaymentId)) {
                    setCreateError(j.error || "Could not start payment. Check server configuration.");
                    return;
                }
                setNpPaymentId(parsedPaymentId);
                setOrderId(String(j.order_id ?? prebuiltOrderId));
                setPayAddress(String(j.pay_address ?? ""));
                setPayAmount(
                    j.pay_amount == null
                        ? null
                        : (() => {
                              const v = typeof j.pay_amount === "string" ? Number(j.pay_amount) : j.pay_amount;
                              return Number.isFinite(v as number) ? (v as number) : null;
                          })()
                );
                setPayCurrency(String(j.pay_currency ?? ""));
                setPollStatus(String(j.payment_status ?? ""));
            } catch {
                if (!cancelled) setCreateError("Network error. Try again.");
            } finally {
                if (!cancelled) setIsCreating(false);
            }
        }

        void create();
        return () => {
            cancelled = true;
        };
    }, [open, plan?.id, plan?.name, userId, investmentAmount]);

    const finalizePayment = useCallback(async () => {
        if (!plan || !userId || npPaymentId == null || !orderId) return;
        if (activatedRef.current) return;
        activatedRef.current = true;

        const email = (userEmail?.trim() || user?.email || "").trim();
        if (!email) {
            toast({
                variant: "destructive",
                title: "Email required",
                description: "Your account has no email on file.",
            });
            activatedRef.current = false;
            return;
        }

        const amt = Number(investmentAmount);
        const txKey = `np_${npPaymentId}`;
        const txLower = txKey.toLowerCase();

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
                    title: "Already processed",
                    description: "This payment was already recorded.",
                });
                setTerminal("fail");
                return;
            }

            let screenshotUrl: string | null = null;
            if (screenshot) {
                toast({ title: "Uploading proof...", description: "Saving your screenshot." });
                screenshotUrl = await uploadScreenshot();
            }

            /** Prefer server-side Admin writes on Vercel (set FIREBASE_SERVICE_ACCOUNT_JSON). */
            if (user) {
                const idToken = await user.getIdToken();
                const completeRes = await fetch("/api/nowpayments/complete-investment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        paymentId: String(npPaymentId),
                        orderId,
                        userId,
                        expectedUsdAmount: amt,
                        planId: plan.id,
                        planName: plan.name,
                        dailyRoiPercent: plan.daily_roi_percent,
                        returnPercent: plan.return_percent,
                        amount: amt,
                        expectedReturn,
                        durationDays: plan.duration_days > 0 ? plan.duration_days : 30,
                        userEmail: email,
                        transactionId: txLower,
                        proofImageUrl: screenshotUrl,
                        payAddress: payAddress || "NOWPayments",
                        paymentMethod: "nowpayments_usdt_bep20",
                    }),
                });
                const completeJson = (await completeRes.json().catch(() => ({}))) as {
                    ok?: boolean;
                    error?: string;
                    alreadyProcessed?: boolean;
                };
                if (completeRes.ok && (completeJson.ok === true || completeJson.alreadyProcessed)) {
                    toast({
                        title: "Plan activated",
                        description: "Your crypto payment was confirmed and your investment is now active.",
                    });
                    setScreenshot(null);
                    setScreenshotPreview(null);
                    setTerminal("ok");
                    onOpenChange(false);
                    return;
                }
                if (completeRes.status !== 501) {
                    toast({
                        variant: "destructive",
                        title: "Activation failed",
                        description: completeJson.error || "Could not activate investment on the server.",
                    });
                    activatedRef.current = false;
                    return;
                }
            }

            const verifyRes = await fetch("/api/nowpayments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentId: String(npPaymentId),
                    orderId,
                    userId,
                    expectedUsdAmount: amt,
                }),
            });
            const verifyJson = (await verifyRes.json().catch(() => ({}))) as {
                valid?: boolean;
                error?: string;
            };

            if (!verifyRes.ok || !verifyJson.valid) {
                toast({
                    variant: "destructive",
                    title: "Verification failed",
                    description: verifyJson.error || "Could not confirm payment.",
                });
                activatedRef.current = false;
                return;
            }

            await activateInvestmentAfterVerifiedPayment({
                user_id: userId,
                user_email: email,
                plan_id: plan.id,
                plan_name: plan.name,
                daily_roi_percent: plan.daily_roi_percent,
                return_percent: plan.return_percent,
                amount: amt,
                expected_return: expectedReturn,
                order_id: orderId,
                duration_days: plan.duration_days > 0 ? plan.duration_days : 30,
                transaction_id: txLower,
                proof_image_url: screenshotUrl,
                wallet_address: payAddress || "NOWPayments",
                payment_method: "nowpayments_usdt_bep20",
                notes: "Auto-verified (NOWPayments)",
            });

            toast({
                title: "Plan activated",
                description: "Your crypto payment was confirmed and your investment is now active.",
            });

            setScreenshot(null);
            setScreenshotPreview(null);
            setTerminal("ok");
            onOpenChange(false);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Activation failed";
            toast({ variant: "destructive", title: "Error", description: message });
            activatedRef.current = false;
        } finally {
            setIsSubmitting(false);
        }
    }, [
        plan,
        userId,
        userEmail,
        user,
        user?.email,
        npPaymentId,
        orderId,
        investmentAmount,
        expectedReturn,
        screenshot,
        payAddress,
        onOpenChange,
        toast,
    ]);

    finalizeRef.current = finalizePayment;

    /** Poll NOWPayments every 10s */
    useEffect(() => {
        if (!open || npPaymentId == null || terminal !== null) return;

        const runPoll = async () => {
            try {
                const res = await fetch(`/api/nowpayments/payment/${npPaymentId}`);
                const j = (await res.json().catch(() => ({}))) as { payment_status?: string; error?: string };
                if (!res.ok) return;

                const st = (j.payment_status || "").toLowerCase();
                setPollStatus(j.payment_status || "");

                if (["failed", "expired", "refunded"].includes(st)) {
                    toast({
                        variant: "destructive",
                        title: "Payment not completed",
                        description:
                            st === "expired"
                                ? "This payment window expired. Close and open again to get a new address."
                                : "The payment could not be completed.",
                    });
                    setTerminal("fail");
                    return;
                }

                if (isPaymentStatusComplete(j.payment_status)) {
                    await finalizeRef.current();
                }
            } catch {
                /* next poll */
            }
        };

        void runPoll();
        const id = window.setInterval(() => void runPoll(), POLL_MS);
        return () => window.clearInterval(id);
    }, [open, npPaymentId, terminal, toast]);

    const refreshStatus = useCallback(async () => {
        if (npPaymentId == null) return;
        try {
            const res = await fetch(`/api/nowpayments/payment/${npPaymentId}`);
            const j = (await res.json().catch(() => ({}))) as { payment_status?: string };
            if (!res.ok) return;
            setPollStatus(j.payment_status || "");
            const st = (j.payment_status || "").toLowerCase();
            if (isPaymentStatusComplete(j.payment_status)) {
                await finalizeRef.current();
            }
        } catch {
            /* ignore */
        }
    }, [npPaymentId]);

    if (!plan) return null;

    const qrSrc =
        payAddress ? generateGenericQRCode(payAddress, payAmount && payAmount > 0 ? payAmount : undefined) : "";

    const statusLower = pollStatus.toLowerCase();
    const isWaiting =
        terminal !== "fail" &&
        !["failed", "expired", "refunded"].includes(statusLower) &&
        !isPaymentStatusComplete(pollStatus);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-slate-900 border-orange-500/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-400">
                        <Wallet className="h-5 w-5" />
                        Complete Your Investment
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Pay with USDT (BEP20 on BNB Smart Chain) via NOWPayments — status updates every few seconds.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <Card className="bg-slate-800 border-orange-500/20">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400">Plan</span>
                                <span className="font-semibold text-white">{plan.name}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400">Investment (USD)</span>
                                <span className="font-bold text-lg text-orange-400">${investmentAmount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Potential upside</span>
                                <span className="font-bold text-green-400 text-lg">Up to 60X</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <p className="text-sm text-slate-400 mb-1">Invoice (USD)</p>
                        <p className="text-2xl font-bold text-orange-400">${investmentAmount}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Pay currency: {payCurrency || "USDT (BEP20)"} · {walletInfo.network}
                        </p>
                        {payAmount != null && (
                            <p className="text-xs text-slate-300 mt-1">
                                Send amount: <span className="font-mono text-orange-300">{payAmount}</span>
                            </p>
                        )}
                        {npPaymentId != null && (
                            <p className="text-[11px] text-slate-500 mt-1">
                                Payment ID: <span className="font-mono">{npPaymentId}</span>
                            </p>
                        )}
                        <div className="text-[11px] text-slate-500 mt-2 text-left space-y-1">
                            <p className="text-slate-400 font-medium">Order ID (your reference)</p>
                            <div className="flex items-start gap-2 flex-wrap">
                                <span className="font-mono text-slate-300 break-all flex-1 min-w-0">
                                    {orderId || (isCreating ? "…" : "—")}
                                </span>
                                {orderId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 shrink-0 text-xs border-slate-600"
                                        onClick={copyOrderId}
                                    >
                                        {orderCopied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-600">
                                Generated when you open this window; same value is sent to NOWPayments when the invoice is created.
                            </p>
                        </div>
                        {pollStatus && (
                            <Badge
                                variant="outline"
                                className="mt-2 bg-slate-800/80 text-slate-200 border-slate-600"
                            >
                                Status: {pollStatus}
                            </Badge>
                        )}
                        {isCreating && (
                            <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 animate-spin" /> Creating secure payment…
                            </p>
                        )}
                        {createError && (
                            <p className="text-xs text-red-400 mt-2">{createError}</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2 text-orange-400">
                                <QrCode className="h-4 w-4" />
                                Deposit address
                            </h4>
                            <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                                NOWPayments
                            </Badge>
                        </div>

                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-orange-300 shadow-sm">
                                <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center relative overflow-hidden bg-white">
                                    {qrSrc ? (
                                        <img
                                            src={qrSrc}
                                            alt="Payment QR Code"
                                            className="w-full h-full object-contain rounded-lg"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = "none";
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = `
                                                        <div class="flex flex-col items-center justify-center w-full h-full bg-gray-50 rounded-lg text-xs text-gray-400 text-center px-2">
                                                            <p>QR Code failed to load.</p>
                                                            <p class="mt-1">Please copy address and try again.</p>
                                                        </div>
                                                    `;
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 rounded-lg text-xs text-gray-400 px-2 text-center">
                                            {isCreating ? "Preparing QR…" : "QR unavailable"}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-center text-slate-500 mt-2">
                                    Send the exact crypto amount shown below to this address (BEP20).
                                </p>
                            </div>
                        </div>
                    </div>

                    {payAmount != null && (
                        <div className="rounded-lg border border-orange-500/30 bg-slate-800/50 p-3 text-center">
                            <p className="text-xs text-slate-400">Send approximately</p>
                            <p className="text-lg font-mono font-semibold text-orange-300">{payAmount} USDT</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                                Rate is locked by NOWPayments; always send the full shown amount.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-300">Deposit address</h4>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-slate-800 p-3 rounded-lg text-xs break-all font-mono text-orange-300 border border-slate-700 min-h-[44px]">
                                {payAddress || (isCreating ? "…" : "—")}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyWalletAddress}
                                disabled={!payAddress}
                                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                            >
                                {copied ? (
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-4 space-y-4">
                            <h4 className="font-medium flex items-center gap-2 text-sm text-yellow-400">
                                <Upload className="h-4 w-4" />
                                Payment Proof <span className="text-slate-500 font-normal">(Optional)</span>
                            </h4>

                            <div className="space-y-2">
                                {!screenshotPreview ? (
                                    <div
                                        className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-800/50 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                                        <p className="text-sm text-slate-400">Screenshot for your records</p>
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

                    <Card className="bg-blue-500/5 border-blue-500/20">
                        <CardContent className="p-4 space-y-2">
                            <h4 className="font-medium flex items-center gap-2 text-sm text-blue-400">
                                <AlertCircle className="h-4 w-4" />
                                Instructions
                            </h4>
                            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                                <li>Copy the address or scan the QR code</li>
                                <li>Send the exact USDT (BEP20) amount shown by NOWPayments</li>
                                <li>Wait — we check payment status every 10 seconds</li>
                                <li>When status is finished, your plan activates automatically</li>
                            </ol>
                        </CardContent>
                    </Card>

                    {isWaiting && npPaymentId != null && (
                        <div className="flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-slate-600 text-slate-300"
                                onClick={() => void refreshStatus()}
                                disabled={isSubmitting}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh status
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                        Cancel
                    </Button>
                    {isSubmitting && (
                        <Button disabled className="w-full sm:w-auto bg-orange-500/80">
                            <Clock className="mr-2 h-4 w-4 animate-spin" /> Activating…
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

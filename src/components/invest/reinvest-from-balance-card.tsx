"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, PiggyBank } from "lucide-react";
import { executeReinvestFromBalance, type ReinvestPlanShape } from "@/lib/reinvest-from-balance";

interface PlanOption {
    id: string;
    name: string;
    min_amount: number;
    max_amount: number;
    fixed_amount?: number;
    duration_days: number;
    return_percent: number;
    daily_roi_percent: number;
    total_return?: number;
    capital_return?: boolean;
}

interface ReinvestFromBalanceCardProps {
    userId: string;
    userEmail: string;
    balance: number;
    plans: PlanOption[];
    reinvestCount?: number;
    reinvestTotal?: number;
    withdrawalRequestCount?: number;
    withdrawalRequestTotal?: number;
    onCompleted?: () => void;
}

export function ReinvestFromBalanceCard({
    userId,
    userEmail,
    balance,
    plans,
    reinvestCount = 0,
    reinvestTotal = 0,
    withdrawalRequestCount = 0,
    withdrawalRequestTotal = 0,
    onCompleted,
}: ReinvestFromBalanceCardProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [planId, setPlanId] = useState<string>("");
    const [amountStr, setAmountStr] = useState("");
    const [busy, setBusy] = useState(false);

    const activePlans = useMemo(() => plans.filter((p) => p.id), [plans]);
    const selected = useMemo(
        () => activePlans.find((p) => p.id === planId) || null,
        [activePlans, planId]
    );

    const handleReinvest = async () => {
        if (!selected) {
            toast({ variant: "destructive", title: "Select a plan" });
            return;
        }
        const amt = parseFloat(amountStr);
        if (!Number.isFinite(amt) || amt <= 0) {
            toast({ variant: "destructive", title: "Invalid amount" });
            return;
        }
        if (amt > balance) {
            toast({ variant: "destructive", title: "Insufficient balance" });
            return;
        }

        setBusy(true);
        try {
            const shape: ReinvestPlanShape = {
                id: selected.id,
                name: selected.name,
                min_amount: selected.min_amount,
                max_amount: selected.max_amount,
                fixed_amount: selected.fixed_amount,
                duration_days: selected.duration_days,
                return_percent: selected.return_percent,
                daily_roi_percent: selected.daily_roi_percent,
                total_return: selected.total_return,
                capital_return: selected.capital_return,
            };
            await executeReinvestFromBalance({
                user_id: userId,
                user_email: userEmail,
                plan: shape,
                amount: amt,
                source: "user",
            });
            toast({
                title: "Re-invested",
                description: `$${amt.toFixed(2)} moved from balance into ${selected.name}.`,
            });
            setOpen(false);
            setAmountStr("");
            onCompleted?.();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Re-invest failed";
            toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
            setBusy(false);
        }
    };

    if (balance <= 0 || activePlans.length === 0) return null;

    return (
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-background">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="h-5 w-5 text-indigo-400" />
                    Re-invest from wallet balance
                </CardTitle>
                <CardDescription>
                    Use main balance to open a new mining plan (same commissions as a new deposit). Your stats:{" "}
                    <span className="text-foreground font-medium">{reinvestCount}</span> re-invests (
                    ${Number(reinvestTotal).toFixed(2)}),{" "}
                    <span className="text-foreground font-medium">{withdrawalRequestCount}</span> withdrawal requests (
                    ${Number(withdrawalRequestTotal).toFixed(2)}).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2" variant="secondary">
                            <PiggyBank className="h-4 w-4" />
                            Re-invest now
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Re-invest from balance</DialogTitle>
                            <DialogDescription>
                                Available: <strong>${balance.toFixed(2)}</strong>. Amount is deducted from your main
                                wallet and a new active investment is created.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Plan</Label>
                                <Select value={planId} onValueChange={setPlanId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activePlans.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} (min ${p.min_amount})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount (USD)</Label>
                                <Input
                                    type="number"
                                    min={selected?.min_amount ?? 0}
                                    max={selected?.max_amount ?? undefined}
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    placeholder={selected ? `e.g. ${selected.min_amount}` : "0"}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button onClick={() => void handleReinvest()} disabled={busy || !planId}>
                                {busy ? "Processing…" : "Confirm re-invest"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

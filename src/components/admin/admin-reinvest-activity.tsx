"use client";

import { useMemo, useState } from "react";
import { useRealtimeCollection, insertRow } from "@/firebase";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { executeReinvestFromBalance, type ReinvestPlanShape } from "@/lib/reinvest-from-balance";
import { format } from "date-fns";
import { RefreshCw, ScrollText } from "lucide-react";

interface ActivityRow {
    id: string;
    user_id: string;
    kind: string;
    amount_usd: number;
    plan_name?: string | null;
    source?: string;
    note?: string | null;
    created_at?: string;
}

export function AdminReinvestActivity() {
    const { toast } = useToast();
    const [userId, setUserId] = useState("");
    const [planId, setPlanId] = useState("");
    const [amountStr, setAmountStr] = useState("");
    const [busy, setBusy] = useState(false);

    const usersOpts = useMemo(() => ({ table: "users" as const, enabled: true }), []);
    const plansOpts = useMemo(() => ({ table: "investment_plans" as const, enabled: true }), []);
    const logOpts = useMemo(
        () => ({
            table: "financial_activity_log" as const,
            limitCount: 200,
            enabled: true,
        }),
        []
    );

    const { data: users } = useRealtimeCollection<{ id: string; email?: string; display_name?: string; username?: string }>(
        usersOpts
    );
    const { data: plans } = useRealtimeCollection<any>(plansOpts);
    const { data: logRaw } = useRealtimeCollection<ActivityRow>(logOpts);

    const log = useMemo(() => {
        if (!logRaw?.length) return logRaw;
        return [...logRaw].sort(
            (a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }, [logRaw]);

    const selectedUser = users?.find((u) => u.id === userId);
    const selectedPlan = plans?.find((p: { id: string }) => p.id === planId);

    const runAdminReinvest = async () => {
        if (!userId || !selectedPlan) {
            toast({ variant: "destructive", title: "Pick user and plan" });
            return;
        }
        const amt = parseFloat(amountStr);
        if (!Number.isFinite(amt) || amt <= 0) {
            toast({ variant: "destructive", title: "Invalid amount" });
            return;
        }
        if (!db) return;

        setBusy(true);
        try {
            const snap = await getDoc(doc(db, "users", userId));
            if (!snap.exists()) throw new Error("User not found");
            const bal = Number(snap.data().balance) || 0;
            if (bal < amt) throw new Error(`Insufficient balance ($${bal.toFixed(2)})`);

            const email = String(snap.data().email || selectedUser?.email || "");
            const shape: ReinvestPlanShape = {
                id: selectedPlan.id,
                name: String(selectedPlan.name || "Plan"),
                min_amount: Number(selectedPlan.min_amount) || 0,
                max_amount: Number(selectedPlan.max_amount) || 1e12,
                fixed_amount: selectedPlan.fixed_amount,
                duration_days: Number(selectedPlan.duration_days) || 30,
                return_percent: Number(selectedPlan.return_percent) || 0,
                daily_roi_percent: Number(selectedPlan.daily_roi_percent) || 0,
                total_return: selectedPlan.total_return,
                capital_return: selectedPlan.capital_return,
            };

            await executeReinvestFromBalance({
                user_id: userId,
                user_email: email,
                plan: shape,
                amount: amt,
                source: "admin",
                note: "Admin panel re-invest",
            });

            await insertRow("notifications", {
                user_id: userId,
                title: "Re-invest completed",
                message: `An administrator re-invested $${amt.toFixed(2)} into ${shape.name} from your balance.`,
                type: "system",
                is_read: false,
                read: false,
            });

            toast({ title: "Done", description: `Re-invest recorded for ${email || userId}` });
            setAmountStr("");
        } catch (e: unknown) {
            toast({
                variant: "destructive",
                title: "Failed",
                description: e instanceof Error ? e.message : "Error",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <RefreshCw className="h-4 w-4 text-indigo-500" />
                        Admin: re-invest from user balance
                    </CardTitle>
                    <CardDescription>
                        Deducts main wallet balance and creates a new active investment (same as user re-invest). User
                        must have enough balance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 sm:col-span-2">
                        <Label>User</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {(users || []).slice(0, 400).map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.email || u.id}{" "}
                                        {u.username ? `(@${u.username})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Plan</Label>
                        <Select value={planId} onValueChange={setPlanId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                                {(plans || []).map((p: { id: string; name?: string }) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name || p.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Amount (USD)</Label>
                        <Input
                            type="number"
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            placeholder="0"
                        />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                        <Button onClick={() => void runAdminReinvest()} disabled={busy}>
                            {busy ? "Working…" : "Execute re-invest"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ScrollText className="h-4 w-4" />
                        Re-invest &amp; withdrawal request log
                    </CardTitle>
                    <CardDescription>
                        Rows from <code className="text-xs">financial_activity_log</code> (last 200). User totals also
                        live on each user: <code className="text-xs">reinvest_count</code>,{" "}
                        <code className="text-xs">withdrawal_request_count</code>, etc.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[320px] pr-3">
                        <div className="space-y-2">
                            {!log?.length ? (
                                <p className="text-sm text-muted-foreground">No log entries yet.</p>
                            ) : (
                                log.map((row) => (
                                    <div
                                        key={row.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                                    >
                                        <div>
                                            <Badge variant="outline">{row.kind}</Badge>{" "}
                                            <span className="font-medium">${Number(row.amount_usd).toFixed(2)}</span>
                                            {row.plan_name && (
                                                <span className="text-muted-foreground"> — {row.plan_name}</span>
                                            )}
                                            <div className="text-xs text-muted-foreground font-mono">{row.user_id}</div>
                                        </div>
                                        <div className="text-xs text-muted-foreground text-right">
                                            {row.source && <span>{row.source} · </span>}
                                            {row.created_at
                                                ? format(new Date(row.created_at), "MMM d, HH:mm")
                                                : "—"}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import {
    DEPOSIT_INCOME_TIERS,
    parseDepositTiersFirestore,
    type DepositIncomeTier,
} from "@/lib/deposit-income-tiers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Layers, RotateCcw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function tiersToFormState(tiers: DepositIncomeTier[]) {
    return tiers.map((t) => ({
        min: String(t.min),
        max: String(t.max),
        incomePercent: String(t.incomePercent),
    }));
}

export function TierSystemManager() {
    const { toast } = useToast();
    const [rows, setRows] = useState(() => tiersToFormState(DEPOSIT_INCOME_TIERS));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!db) return;
        const ref = doc(db, "platform_settings", "main");
        const unsub = onSnapshot(ref, (snap) => {
            const parsed = parseDepositTiersFirestore(snap.data()?.deposit_tiers);
            if (parsed) setRows(tiersToFormState(parsed));
        });
        return () => unsub();
    }, []);

    const updateRow = (i: number, field: "min" | "max" | "incomePercent", value: string) => {
        setRows((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], [field]: value };
            return next;
        });
    };

    const addRow = () => {
        const last = rows[rows.length - 1];
        const lastMax = parseFloat(last?.max || "0") || 0;
        setRows((prev) => [
            ...prev,
            { min: String(lastMax + 1), max: String(lastMax + 1000), incomePercent: "2" },
        ]);
    };

    const removeLast = () => {
        if (rows.length <= 1) return;
        setRows((prev) => prev.slice(0, -1));
    };

    const resetDefaults = () => {
        setRows(tiersToFormState(DEPOSIT_INCOME_TIERS));
        toast({ title: "Form reset", description: "Showing built-in defaults — Save to write to database." });
    };

    const save = async () => {
        if (!db) {
            toast({ variant: "destructive", title: "Firebase not configured" });
            return;
        }
        const built: DepositIncomeTier[] = [];
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const min = parseFloat(r.min);
            const max = parseFloat(r.max);
            const incomePercent = parseFloat(r.incomePercent);
            if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(incomePercent)) {
                toast({ variant: "destructive", title: "Invalid row", description: `Row ${i + 1}: use numbers only.` });
                return;
            }
            if (min > max) {
                toast({ variant: "destructive", title: "Invalid range", description: `Row ${i + 1}: min cannot exceed max.` });
                return;
            }
            built.push({ level: i + 1, min, max, incomePercent });
        }
        const sorted = [...built].sort((a, b) => a.min - b.min);
        const normalized = sorted.map((t, i) => ({ ...t, level: i + 1 }));
        const valid = parseDepositTiersFirestore(normalized);
        if (!valid) {
            toast({ variant: "destructive", title: "Validation failed", description: "Check all fields." });
            return;
        }
        setSaving(true);
        try {
            await setDoc(
                doc(db, "platform_settings", "main"),
                {
                    deposit_tiers: normalized,
                    deposit_tiers_updated_at: new Date().toISOString(),
                },
                { merge: true }
            );
            toast({ title: "Saved", description: "Deposit tiers updated. App and landing sync live." });
        } catch (e: unknown) {
            toast({
                variant: "destructive",
                title: "Save failed",
                description: e instanceof Error ? e.message : "Unknown error",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border-border">
            <CardHeader className="space-y-1 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Layers className="h-5 w-5 text-amber-500" />
                    Dynamic tier system
                </CardTitle>
                <CardDescription>
                    Deposit amount ranges and daily profit % (of principal). Same table powers claims, activation, and landing.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert>
                    <AlertDescription className="text-xs sm:text-sm">
                        After saving, users see new rates on refresh. Server activation reads this doc automatically.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3">
                    {rows.map((r, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 rounded-lg border bg-muted/30"
                        >
                            <div className="col-span-2 sm:col-span-1 flex items-center text-sm font-medium text-muted-foreground">
                                Tier {i + 1}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Min $</Label>
                                <Input
                                    inputMode="decimal"
                                    value={r.min}
                                    onChange={(e) => updateRow(i, "min", e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Max $</Label>
                                <Input
                                    inputMode="decimal"
                                    value={r.max}
                                    onChange={(e) => updateRow(i, "max", e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                                <Label className="text-xs">Daily %</Label>
                                <Input
                                    inputMode="decimal"
                                    value={r.incomePercent}
                                    onChange={(e) => updateRow(i, "incomePercent", e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col-reverse sm:flex-row flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full sm:w-auto">
                        Add tier
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={removeLast} className="w-full sm:w-auto">
                        Remove last
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={resetDefaults} className="w-full sm:w-auto">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset form to defaults
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => void save()}
                        disabled={saving}
                        className="w-full sm:w-auto sm:ml-auto bg-amber-600 hover:bg-amber-700"
                    >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? "Saving…" : "Save to database"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

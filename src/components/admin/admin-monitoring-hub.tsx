"use client";

import { useMemo } from "react";
import { useRealtimeCollection } from "@/firebase";
import { InvestmentApproval } from "@/components/admin/investment-approval";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Pickaxe } from "lucide-react";
import { getEffectiveDailyIncomeUsd } from "@/lib/deposit-income-tiers";

interface UserInvestmentRow {
    id: string;
    user_id?: string;
    plan_name?: string;
    amount?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    mining_started?: boolean;
    earned_so_far?: number;
}

export function AdminMonitoringHub() {
    const invOpts = useMemo(
        () => ({
            table: "user_investments" as const,
            orderByColumn: { column: "start_date", direction: "desc" as const },
            limitCount: 200,
            enabled: true,
        }),
        []
    );
    const { data: investments, isLoading } = useRealtimeCollection<UserInvestmentRow>(invOpts);

    const active = (investments || []).filter((i) => i.status === "active").length;
    const total = investments?.length ?? 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tracked positions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold">{isLoading ? "—" : total}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active mining</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold text-green-600">{isLoading ? "—" : active}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Pickaxe className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold">Investment queue &amp; activation</h2>
                </div>
                <InvestmentApproval />
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Activity className="h-5 w-5 text-cyan-500" />
                        Live mining / investment positions
                    </CardTitle>
                    <CardDescription>Recent user_investments (newest first). Daily $ uses tier table.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[min(420px,55vh)] sm:h-[min(480px,50vh)] rounded-md border">
                        <div className="p-2 space-y-2">
                            {isLoading && <p className="text-sm text-muted-foreground p-2">Loading…</p>}
                            {!isLoading && (investments || []).length === 0 && (
                                <p className="text-sm text-muted-foreground p-4 text-center">No investments yet.</p>
                            )}
                            {(investments || []).map((inv) => (
                                <div
                                    key={inv.id}
                                    className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/40 text-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{inv.plan_name || "Plan"}</p>
                                        <p className="text-xs text-muted-foreground font-mono truncate">
                                            {inv.user_id?.slice(0, 12)}…
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">${Number(inv.amount || 0).toLocaleString()}</Badge>
                                        <Badge variant={inv.status === "active" ? "default" : "secondary"}>
                                            {inv.status || "—"}
                                        </Badge>
                                        {inv.mining_started && (
                                            <Badge className="bg-orange-600">Mining</Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            ~${getEffectiveDailyIncomeUsd(inv).toFixed(2)}/day
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

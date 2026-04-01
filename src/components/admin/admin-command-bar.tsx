"use client";

import { useMemo, useState, useCallback, type KeyboardEvent } from "react";
import { useRealtimeCollection } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Inbox,
    Search,
    ArrowRight,
    Users,
    CreditCard,
    Wallet,
    Pickaxe,
    Gift,
    ShieldCheck,
    Headphones,
    ListTodo,
} from "lucide-react";
import type { AdminTabId } from "@/lib/admin-tabs";

export interface AdminCommandBarProps {
    onJump: (tab: AdminTabId, opts?: { userQuery?: string }) => void;
}

/**
 * Single place for “what needs attention” + quick user lookup.
 * Uses only filtered Firestore listeners (no orderBy) to avoid index loops.
 */
export function AdminCommandBar({ onJump }: AdminCommandBarProps) {
    const [userLookup, setUserLookup] = useState("");

    const txPendingOpts = useMemo(
        () => ({
            table: "transactions" as const,
            filters: [{ column: "status", operator: "==" as const, value: "pending" }],
            enabled: true,
        }),
        []
    );
    const payVerOpts = useMemo(
        () => ({
            table: "payment_verifications" as const,
            filters: [{ column: "status", operator: "==" as const, value: "pending_verification" }],
            enabled: true,
        }),
        []
    );
    const invOpts = useMemo(
        () => ({
            table: "pending_investments" as const,
            enabled: true,
        }),
        []
    );
    const refWdOpts = useMemo(
        () => ({
            table: "referral_withdrawals" as const,
            filters: [{ column: "status", operator: "==" as const, value: "pending" }],
            enabled: true,
        }),
        []
    );
    const kycOpts = useMemo(
        () => ({
            table: "kyc_documents" as const,
            filters: [
                {
                    column: "status",
                    operator: "in" as const,
                    value: ["pending", "under_review"],
                },
            ],
            enabled: true,
        }),
        []
    );
    const supportOpts = useMemo(
        () => ({
            table: "support_tickets" as const,
            filters: [
                {
                    column: "status",
                    operator: "in" as const,
                    value: ["open", "in_progress"],
                },
            ],
            enabled: true,
        }),
        []
    );

    const { data: pendingTxs } = useRealtimeCollection(txPendingOpts);
    const { data: pendingPay } = useRealtimeCollection(payVerOpts);
    const { data: pendingInv } = useRealtimeCollection(invOpts);
    const { data: pendingRefWd } = useRealtimeCollection(refWdOpts);
    const { data: kycQueue } = useRealtimeCollection(kycOpts);
    const { data: supportQueue } = useRealtimeCollection(supportOpts);

    const counts = useMemo(() => {
        const txs = pendingTxs ?? [];
        const depositsEtc = txs.filter((t: any) => t.type !== "withdrawal").length;
        const balanceWithdrawals = txs.filter((t: any) => t.type === "withdrawal").length;
        const investments =
            pendingInv?.filter(
                (i: any) =>
                    i.status === "pending_payment_confirmation" || i.status === "payment_received"
            ).length ?? 0;

        return {
            depositsEtc,
            balanceWithdrawals,
            proofs: pendingPay?.length ?? 0,
            investments,
            referralWd: pendingRefWd?.length ?? 0,
            kyc: kycQueue?.length ?? 0,
            support: supportQueue?.length ?? 0,
        };
    }, [pendingTxs, pendingPay, pendingInv, pendingRefWd, kycQueue, supportQueue]);

    const totalQueue =
        counts.depositsEtc +
        counts.balanceWithdrawals +
        counts.proofs +
        counts.investments +
        counts.referralWd +
        counts.kyc +
        counts.support;

    const goUserSearch = useCallback(() => {
        const q = userLookup.trim();
        onJump("users", { userQuery: q });
    }, [userLookup, onJump]);

    const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") goUserSearch();
    };

    type QueueItem = {
        key: string;
        label: string;
        n: number;
        tab: AdminTabId;
        icon: typeof Inbox;
    };

    const items: QueueItem[] = [
        {
            key: "tx",
            label: "Deposits / other TX",
            n: counts.depositsEtc,
            tab: "transactions",
            icon: CreditCard,
        },
        {
            key: "wd",
            label: "Balance withdrawals",
            n: counts.balanceWithdrawals,
            tab: "withdrawals",
            icon: Wallet,
        },
        {
            key: "pv",
            label: "Payment proofs",
            n: counts.proofs,
            tab: "payments",
            icon: ListTodo,
        },
        {
            key: "inv",
            label: "Investments queue",
            n: counts.investments,
            tab: "investments",
            icon: Pickaxe,
        },
        {
            key: "ref",
            label: "Referral cashouts",
            n: counts.referralWd,
            tab: "referrals",
            icon: Gift,
        },
        {
            key: "kyc",
            label: "KYC inbox",
            n: counts.kyc,
            tab: "kyc",
            icon: ShieldCheck,
        },
        {
            key: "sup",
            label: "Support tickets",
            n: counts.support,
            tab: "support",
            icon: Headphones,
        },
    ];

    return (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-background to-background">
            <CardContent className="p-4 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <Inbox className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base">Easy Admin — action queue</p>
                            <p className="text-xs text-muted-foreground truncate">
                                One glance: open items only. Click a chip to jump — no hunting through menus.
                            </p>
                        </div>
                        <Badge variant={totalQueue > 0 ? "default" : "secondary"} className="shrink-0">
                            {totalQueue} open
                        </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Find user: email, @username, UID…"
                                className="pl-9"
                                value={userLookup}
                                onChange={(e) => setUserLookup(e.target.value)}
                                onKeyDown={onSearchKeyDown}
                            />
                        </div>
                        <Button type="button" onClick={goUserSearch} className="shrink-0">
                            <Users className="h-4 w-4 mr-2" />
                            User Control
                            <ArrowRight className="h-4 w-4 ml-2 opacity-70" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {items.map(({ key, label, n, tab, icon: Icon }) => (
                        <Button
                            key={key}
                            type="button"
                            size="sm"
                            variant={n > 0 ? "default" : "outline"}
                            className={
                                n > 0
                                    ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                                    : "text-muted-foreground"
                            }
                            onClick={() => onJump(tab)}
                        >
                            <Icon className="h-3.5 w-3.5 mr-1.5 opacity-90" />
                            {label}
                            <Badge
                                variant="secondary"
                                className="ml-2 h-5 min-w-[1.25rem] px-1.5 text-[10px] tabular-nums"
                            >
                                {n}
                            </Badge>
                        </Button>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={() => onJump("overview")}>
                        Full stats
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

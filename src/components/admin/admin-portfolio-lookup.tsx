"use client";

import { useMemo, useState } from "react";
import { useRealtimeCollection, deleteRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PortfolioRow {
    id: string;
    user_id?: string;
    name?: string;
}

interface AssetRow {
    id: string;
    portfolio_id?: string;
    symbol?: string;
    name?: string;
    quantity?: number;
}

function PortfolioAssetsBlock({ portfolioId, portfolioName }: { portfolioId: string; portfolioName: string }) {
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);

    const assetsOpts = useMemo(
        () => ({
            table: "assets" as const,
            filters: [{ column: "portfolio_id", operator: "==" as const, value: portfolioId }],
            enabled: !!portfolioId,
        }),
        [portfolioId]
    );
    const { data: assets, isLoading } = useRealtimeCollection<AssetRow>(assetsOpts);

    const handleDeletePortfolio = async () => {
        if (
            !confirm(
                `Delete portfolio "${portfolioName}" and all ${assets?.length ?? 0} asset row(s)? This cannot be undone.`
            )
        ) {
            return;
        }
        setBusy(true);
        try {
            for (const a of assets || []) {
                await deleteRow("assets", a.id);
            }
            await deleteRow("portfolios", portfolioId);
            toast({ title: "Portfolio removed", description: "Assets and portfolio document deleted." });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
            setBusy(false);
        }
    };

    const deleteOneAsset = async (id: string) => {
        try {
            await deleteRow("assets", id);
            toast({ title: "Asset removed" });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed";
            toast({ variant: "destructive", title: "Error", description: msg });
        }
    };

    return (
        <div className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="font-medium">{portfolioName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{portfolioId}</p>
                </div>
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleDeletePortfolio()}
                >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete portfolio
                </Button>
            </div>
            {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading assets…</p>
            ) : (assets || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No asset rows.</p>
            ) : (
                <ul className="text-sm space-y-1">
                    {(assets || []).map((a) => (
                        <li
                            key={a.id}
                            className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1"
                        >
                            <span>
                                <Badge variant="outline" className="mr-2">
                                    {a.symbol || "?"}
                                </Badge>
                                {a.name || a.id}
                                {typeof a.quantity === "number" && (
                                    <span className="text-muted-foreground"> × {a.quantity}</span>
                                )}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive"
                                onClick={() => void deleteOneAsset(a.id)}
                            >
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function AdminPortfolioLookup() {
    const [uid, setUid] = useState("");
    const trimmed = uid.trim();

    const portfoliosOpts = useMemo(
        () => ({
            table: "portfolios" as const,
            filters:
                trimmed.length >= 8
                    ? [{ column: "user_id", operator: "==" as const, value: trimmed }]
                    : [],
            enabled: trimmed.length >= 8,
        }),
        [trimmed]
    );

    const { data: portfolios, isLoading } = useRealtimeCollection<PortfolioRow>(portfoliosOpts);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    <CardTitle>Portfolios &amp; demo assets</CardTitle>
                </div>
                <CardDescription>
                    Members use the <strong>Portfolio</strong> page for sample holdings. Paste a Firebase{" "}
                    <code className="text-xs bg-muted px-1 rounded">user_id</code> from Users → details to list every
                    portfolio and clean up bad or duplicate rows.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xl">
                    <Label htmlFor="port-uid">Member UID</Label>
                    <Input
                        id="port-uid"
                        placeholder="Paste user Firebase UID"
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                    />
                </div>
                {trimmed.length > 0 && trimmed.length < 8 && (
                    <p className="text-sm text-muted-foreground">Enter the full UID (at least 8 characters).</p>
                )}
                {trimmed.length >= 8 && (
                    <>
                        {isLoading && <p className="text-sm text-muted-foreground">Loading portfolios…</p>}
                        {!isLoading && (!portfolios || portfolios.length === 0) && (
                            <p className="text-sm text-muted-foreground">No portfolio documents for this UID.</p>
                        )}
                        <div className="space-y-3">
                            {(portfolios || []).map((p) => (
                                <PortfolioAssetsBlock
                                    key={p.id}
                                    portfolioId={p.id}
                                    portfolioName={p.name || "Unnamed portfolio"}
                                />
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

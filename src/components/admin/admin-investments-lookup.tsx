"use client";

import { useMemo, useState } from "react";
import { useRealtimeCollection, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Pickaxe, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserInvestmentRow {
    id: string;
    user_id?: string;
    plan_name?: string;
    amount?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    admin_support_note?: string;
}

export function AdminInvestmentsLookup() {
    const { toast } = useToast();
    const [uid, setUid] = useState("");
    const [noteRow, setNoteRow] = useState<UserInvestmentRow | null>(null);
    const [noteDraft, setNoteDraft] = useState("");
    const [saving, setSaving] = useState(false);

    const trimmed = uid.trim();

    const invOpts = useMemo(
        () => ({
            table: "user_investments" as const,
            filters:
                trimmed.length >= 8
                    ? [{ column: "user_id", operator: "==" as const, value: trimmed }]
                    : [],
            orderByColumn: { column: "start_date", direction: "desc" as const },
            limitCount: 100,
            enabled: trimmed.length >= 8,
        }),
        [trimmed]
    );

    const { data: rows, isLoading } = useRealtimeCollection<UserInvestmentRow>(invOpts);

    const openNote = (r: UserInvestmentRow) => {
        setNoteRow(r);
        setNoteDraft(r.admin_support_note || "");
    };

    const saveNote = async () => {
        if (!noteRow) return;
        setSaving(true);
        try {
            await updateRow("user_investments", noteRow.id, {
                admin_support_note: noteDraft.trim(),
                updated_at: new Date().toISOString(),
            });
            toast({ title: "Note saved", description: "Internal note stored on this investment record." });
            setNoteRow(null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Save failed";
            toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Pickaxe className="h-5 w-5" />
                        <CardTitle>Mining / investment positions</CardTitle>
                    </div>
                    <CardDescription>
                        View active and past <code className="text-xs bg-muted px-1 rounded">user_investments</code> for
                        a member. Add an <strong>internal support note</strong> (for your team only — not shown on the
                        member app unless you surface this field later). Use wallet credit/debit for balance fixes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 max-w-xl">
                        <Label htmlFor="inv-uid">Member UID</Label>
                        <Input
                            id="inv-uid"
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
                            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                            {!isLoading && (!rows || rows.length === 0) && (
                                <p className="text-sm text-muted-foreground">No investment rows for this UID.</p>
                            )}
                            <div className="space-y-2">
                                {(rows || []).map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <p className="font-medium truncate">{r.plan_name || "Plan"}</p>
                                            <p className="text-xs text-muted-foreground font-mono truncate">{r.id}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">${Number(r.amount || 0).toLocaleString()}</Badge>
                                                <Badge variant="secondary">{r.status || "—"}</Badge>
                                                {r.start_date && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(r.start_date), "MMM d, yyyy")}
                                                    </span>
                                                )}
                                            </div>
                                            {r.admin_support_note && (
                                                <p className="text-xs text-amber-700 dark:text-amber-300 line-clamp-2">
                                                    Note: {r.admin_support_note}
                                                </p>
                                            )}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => openNote(r)}>
                                            <StickyNote className="h-4 w-4 mr-1" />
                                            Support note
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!noteRow} onOpenChange={(o) => !o && setNoteRow(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Internal support note</DialogTitle>
                    </DialogHeader>
                    <Textarea
                        rows={5}
                        placeholder="What you agreed with the member, ticket ID, next steps…"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setNoteRow(null)}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={saving} onClick={() => void saveNote()}>
                            {saving ? "Saving…" : "Save note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { auth } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link2, Loader2 } from "lucide-react";

/**
 * Repair missed referral for existing users (no new account). Uses server Admin SDK — works on Vercel if env is set.
 */
export function AdminReferralRepairPanel() {
    const { user } = useUser();
    const { toast } = useToast();
    const [childUid, setChildUid] = useState("");
    const [sponsorUid, setSponsorUid] = useState("");
    const [force, setForce] = useState(false);
    const [dryRun, setDryRun] = useState(true);
    const [pending, setPending] = useState(false);

    async function run() {
        const c = childUid.trim();
        const s = sponsorUid.trim();
        if (!c || !s) {
            toast({ variant: "destructive", title: "Fill both UIDs", description: "Member UID and sponsor UID (Auth UID)." });
            return;
        }
        if (!auth?.currentUser) {
            toast({ variant: "destructive", title: "Not signed in", description: "Log in as admin first." });
            return;
        }
        setPending(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch("/api/admin/link-referral", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    childUid: c,
                    sponsorUid: s,
                    force,
                    dryRun,
                }),
            });
            const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
            if (!res.ok || !data.ok) {
                toast({
                    variant: "destructive",
                    title: "Request failed",
                    description: data.error || res.statusText,
                });
                return;
            }
            toast({
                title: dryRun ? "Dry run OK" : "Referral linked",
                description: data.message || "Done.",
            });
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Network error",
                description: e instanceof Error ? e.message : "Unknown error",
            });
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
            <div className="flex items-start gap-2">
                <Link2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-sm">Repair referral (old signups)</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        If someone registered without a sponsor link, set their <strong>member UID</strong> (Firestore{" "}
                        <code className="text-[11px]">users</code> doc id) and the <strong>sponsor UID</strong>. Turn off
                        dry run only when the preview message looks correct. Does not back-pay old commissions.
                    </p>
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="repair-child-uid">Member UID (referred user)</Label>
                    <Input
                        id="repair-child-uid"
                        value={childUid}
                        onChange={(e) => setChildUid(e.target.value)}
                        placeholder="Firebase Auth UID"
                        className="font-mono text-xs"
                        disabled={pending}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="repair-sponsor-uid">Sponsor UID (direct upline)</Label>
                    <Input
                        id="repair-sponsor-uid"
                        value={sponsorUid}
                        onChange={(e) => setSponsorUid(e.target.value)}
                        placeholder="Firebase Auth UID"
                        className="font-mono text-xs"
                        disabled={pending}
                    />
                </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Switch id="repair-dry" checked={dryRun} onCheckedChange={setDryRun} disabled={pending} />
                    <Label htmlFor="repair-dry" className="text-sm font-normal cursor-pointer">
                        Dry run only (no writes)
                    </Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch id="repair-force" checked={force} onCheckedChange={setForce} disabled={pending} />
                    <Label htmlFor="repair-force" className="text-sm font-normal cursor-pointer">
                        Force overwrite <code className="text-[11px]">referrer_id</code>
                    </Label>
                </div>
            </div>
            <Button type="button" onClick={run} disabled={pending || !user} className="gap-2">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {dryRun ? "Preview (dry run)" : "Apply link"}
            </Button>
        </div>
    );
}

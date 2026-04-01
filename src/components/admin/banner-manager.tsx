"use client";

import { useState } from "react";
import { useRealtimeCollection, insertRow, updateRow, deleteRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Plus, Pencil, Trash2, GripVertical } from "lucide-react";

export interface SiteBanner {
    id: string;
    title: string;
    media_type: "image" | "video";
    media_url: string;
    link_url?: string;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
}

type BannerForm = {
    title: string;
    media_type: "image" | "video";
    media_url: string;
    link_url: string;
    sort_order: string;
    is_active: boolean;
};

const emptyForm: BannerForm = {
    title: "",
    media_type: "image",
    media_url: "",
    link_url: "",
    sort_order: "0",
    is_active: true,
};

export function BannerManager() {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<SiteBanner | null>(null);
    const [form, setForm] = useState<BannerForm>(emptyForm);

    const { data: raw, isLoading } = useRealtimeCollection<SiteBanner>({
        table: "site_banners",
        enabled: true,
    });

    const banners = [...(raw || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, sort_order: String(banners.length) });
        setDialogOpen(true);
    };

    const openEdit = (b: SiteBanner) => {
        setEditing(b);
        setForm({
            title: b.title || "",
            media_type: b.media_type === "video" ? "video" : "image",
            media_url: b.media_url || "",
            link_url: b.link_url || "",
            sort_order: String(b.sort_order ?? 0),
            is_active: !!b.is_active,
        });
        setDialogOpen(true);
    };

    const save = async () => {
        const media_url = form.media_url.trim();
        if (!form.title.trim() || !media_url) {
            toast({ variant: "destructive", title: "Title and media URL required" });
            return;
        }
        if (!/^https?:\/\//i.test(media_url)) {
            toast({ variant: "destructive", title: "Media URL must start with http:// or https://" });
            return;
        }
        const sort_order = parseInt(form.sort_order, 10);
        const payload = {
            title: form.title.trim(),
            media_type: form.media_type,
            media_url,
            link_url: form.link_url.trim() || null,
            sort_order: Number.isFinite(sort_order) ? sort_order : 0,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
        };
        try {
            if (editing) {
                await updateRow("site_banners", editing.id, payload);
                toast({ title: "Banner updated" });
            } else {
                await insertRow("site_banners", {
                    ...payload,
                    created_at: new Date().toISOString(),
                });
                toast({ title: "Banner created" });
            }
            setDialogOpen(false);
        } catch (e: unknown) {
            toast({
                variant: "destructive",
                title: "Failed",
                description: e instanceof Error ? e.message : "Error",
            });
        }
    };

    const remove = async (b: SiteBanner) => {
        if (!confirm(`Delete banner “${b.title}”?`)) return;
        try {
            await deleteRow("site_banners", b.id);
            toast({ title: "Deleted" });
        } catch (e: unknown) {
            toast({ variant: "destructive", title: e instanceof Error ? e.message : "Delete failed" });
        }
    };

    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <ImageIcon className="h-5 w-5 text-violet-500" />
                            Banner management
                        </CardTitle>
                        <CardDescription>
                            Hero slides: image URL or short MP4/WebM. Shown on the public home page when active.
                        </CardDescription>
                    </div>
                    <Button size="sm" onClick={openNew} className="w-full sm:w-auto shrink-0">
                        <Plus className="h-4 w-4 mr-1" />
                        Add banner
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!isLoading && banners.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
                        No banners yet. Add one with a public HTTPS image or video URL.
                    </p>
                )}
                <ul className="space-y-2">
                    {banners.map((b) => (
                        <li
                            key={b.id}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-muted/20"
                        >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 hidden sm:block" />
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{b.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{b.media_url}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        <Badge variant="outline">{b.media_type}</Badge>
                                        <Badge variant={b.is_active ? "default" : "secondary"}>
                                            {b.is_active ? "Active" : "Off"}
                                        </Badge>
                                        <Badge variant="secondary">Order {b.sort_order ?? 0}</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(b)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button type="button" size="sm" variant="destructive" onClick={() => void remove(b)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editing ? "Edit banner" : "New banner"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <div className="space-y-1">
                                <Label>Title</Label>
                                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label>Media type</Label>
                                <Select
                                    value={form.media_type}
                                    onValueChange={(v) => setForm((f) => ({ ...f, media_type: v as "image" | "video" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="video">Video (MP4/WebM URL)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Media URL (HTTPS)</Label>
                                <Input
                                    placeholder="https://…"
                                    value={form.media_url}
                                    onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Optional link (click-through)</Label>
                                <Input
                                    placeholder="https://…"
                                    value={form.link_url}
                                    onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Sort order</Label>
                                <Input
                                    inputMode="numeric"
                                    value={form.sort_order}
                                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <Label>Active on homepage</Label>
                                <Switch
                                    checked={form.is_active}
                                    onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))}
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => void save()}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

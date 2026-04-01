"use client";

import { useMemo, useState } from "react";
import { useRealtimeCollection, insertRow, batchInsertRows } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Megaphone, Send, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Audience = "all" | "one";

interface UserRow {
    id: string;
    email?: string;
    display_name?: string;
}

export function PromotionalMessagesManager() {
    const { toast } = useToast();
    const [audience, setAudience] = useState<Audience>("all");
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [notifType, setNotifType] = useState<"promotional" | "system">("promotional");
    const [sending, setSending] = useState(false);
    const [confirmAllOpen, setConfirmAllOpen] = useState(false);

    const usersOpts = useMemo(
        () => ({
            table: "users" as const,
            enabled: true,
        }),
        []
    );
    const { data: users, isLoading: usersLoading } = useRealtimeCollection<UserRow>(usersOpts);

    const eligibleUsers = useMemo(
        () => (users ?? []).filter((u) => typeof u.id === "string" && u.id.length > 0),
        [users]
    );

    const sendPayload = (userId: string) => ({
        user_id: userId,
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        is_read: false,
        read: false,
    });

    const runSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast({
                variant: "destructive",
                title: "Missing fields",
                description: "Add a title and message.",
            });
            return;
        }

        if (audience === "one" && !selectedUserId) {
            toast({
                variant: "destructive",
                title: "Pick a user",
                description: "Select who should receive this notification.",
            });
            return;
        }

        setSending(true);
        try {
            if (audience === "one") {
                await insertRow("notifications", sendPayload(selectedUserId));
                toast({
                    title: "Sent",
                    description: "In-app notification delivered to that user.",
                });
            } else {
                const rows = eligibleUsers.map((u) => sendPayload(u.id));
                if (rows.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "No users",
                        description: "There are no user records to notify.",
                    });
                    return;
                }
                await batchInsertRows("notifications", rows);
                toast({
                    title: "Broadcast sent",
                    description: `${rows.length} user(s) received this in-app notification.`,
                });
            }
            setTitle("");
            setMessage("");
            setSelectedUserId("");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Send failed";
            toast({ variant: "destructive", title: "Error", description: msg });
        } finally {
            setSending(false);
            setConfirmAllOpen(false);
        }
    };

    const onSubmit = () => {
        if (audience === "all") {
            setConfirmAllOpen(true);
            return;
        }
        void runSend();
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-amber-600" />
                        <CardTitle>Promotional &amp; announcements</CardTitle>
                    </div>
                    <CardDescription>
                        Send in-app notifications that appear on each user&apos;s{" "}
                        <span className="font-medium text-foreground">Notifications</span> page. This is not email or
                        push — only inside the app.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Audience</Label>
                        <RadioGroup
                            value={audience}
                            onValueChange={(v) => setAudience(v as Audience)}
                            className="flex flex-col gap-3 sm:flex-row sm:gap-6"
                        >
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                                <RadioGroupItem value="all" id="aud-all" />
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">All users ({eligibleUsers.length})</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                                <RadioGroupItem value="one" id="aud-one" />
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">One user</span>
                            </label>
                        </RadioGroup>
                    </div>

                    {audience === "one" && (
                        <div className="space-y-2">
                            <Label htmlFor="user-pick">User</Label>
                            <Select
                                value={selectedUserId || undefined}
                                onValueChange={setSelectedUserId}
                                disabled={usersLoading}
                            >
                                <SelectTrigger id="user-pick" className="w-full max-w-md">
                                    <SelectValue placeholder={usersLoading ? "Loading…" : "Select user"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[280px]">
                                    {eligibleUsers.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.email || u.display_name || u.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="pm-title">Title</Label>
                        <Input
                            id="pm-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. New bonus weekend"
                            maxLength={200}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pm-body">Message</Label>
                        <Textarea
                            id="pm-body"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Your promotional or system message…"
                            rows={5}
                            maxLength={4000}
                            className="resize-y min-h-[120px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Type (shown in the app)</Label>
                        <Select
                            value={notifType}
                            onValueChange={(v) => setNotifType(v as "promotional" | "system")}
                        >
                            <SelectTrigger className="w-full max-w-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="promotional">Promotional</SelectItem>
                                <SelectItem value="system">System / general</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button type="button" onClick={onSubmit} disabled={sending} className="gap-2">
                        <Send className="h-4 w-4" />
                        {sending ? "Sending…" : audience === "all" ? "Send to all users" : "Send notification"}
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send to all {eligibleUsers.length} users?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Everyone with an account will see this on their Notifications page. This cannot be undone
                            (but users can mark it read).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
                        <Button type="button" disabled={sending} onClick={() => void runSend()}>
                            {sending ? "Sending…" : "Yes, broadcast"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

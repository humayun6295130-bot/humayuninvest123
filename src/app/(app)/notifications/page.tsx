"use client";

import { useMemo } from "react";
import { useUser, useRealtimeCollection, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, Wallet, Gift, Check, CheckCheck, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'investment' | 'withdrawal' | 'deposit' | 'system' | 'referral' | 'promotional';
    /** Preferred; some older writes used `read` only. */
    is_read?: boolean;
    read?: boolean;
    created_at: string;
}

function isNotificationUnread(n: Pick<Notification, 'is_read' | 'read'>): boolean {
    if (n.is_read === true || n.read === true) return false;
    return true;
}

export default function NotificationsPage() {
    const { user } = useUser();
    const { toast } = useToast();

    const uid = user?.uid;
    const notificationsOptions = useMemo(
        () => ({
            table: 'notifications',
            filters: uid ? [{ column: 'user_id', operator: '==' as const, value: uid }] : [],
            orderByColumn: { column: 'created_at', direction: 'desc' as const },
            enabled: !!uid,
        }),
        [uid]
    );

    const { data: notifications, isLoading, error: notificationsError } =
        useRealtimeCollection<Notification>(notificationsOptions);

    const unreadCount = notifications?.filter((n) => isNotificationUnread(n)).length || 0;

    const markAsRead = async (id: string) => {
        try {
            await updateRow('notifications', id, { is_read: true, read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!notifications) return;

        const unreadNotifications = notifications.filter((n) => isNotificationUnread(n));
        await Promise.all(
            unreadNotifications.map((n) => updateRow('notifications', n.id, { is_read: true, read: true }))
        );

        toast({
            title: "All notifications marked as read",
        });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'investment':
                return <TrendingUp className="h-5 w-5 text-blue-600" />;
            case 'withdrawal':
            case 'deposit':
                return <Wallet className="h-5 w-5 text-green-600" />;
            case 'referral':
                return <Gift className="h-5 w-5 text-purple-600" />;
            case 'promotional':
                return <Megaphone className="h-5 w-5 text-amber-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-600" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading notifications...</p>
            </div>
        );
    }

    if (notificationsError) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">Could not load notifications</CardTitle>
                        <CardDescription>
                            {notificationsError.message.includes('index') || notificationsError.message.includes('Index')
                                ? 'Firestore needs a composite index for this query. Deploy indexes from the project (npm run firebase:deploy:indexes), or create the index from the link in the browser console.'
                                : notificationsError.message}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Notifications</h1>
                    <p className="text-muted-foreground">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No new notifications'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" onClick={markAllAsRead}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark All Read
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Notifications</CardTitle>
                    <CardDescription>Stay updated with your account activities</CardDescription>
                </CardHeader>
                <CardContent>
                    {notifications?.length === 0 ? (
                        <div className="text-center py-8">
                            <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications?.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`flex items-start gap-4 p-4 border rounded-lg ${isNotificationUnread(notification) ? 'bg-orange-500/10 border-orange-500/30' : 'border-border'}`}
                                >
                                    <div className="p-2 bg-[#1a1a1a] rounded-full">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold">{notification.title}</h4>
                                            <span className="text-sm text-muted-foreground">
                                                {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                    </div>
                                    {isNotificationUnread(notification) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => markAsRead(notification.id)}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

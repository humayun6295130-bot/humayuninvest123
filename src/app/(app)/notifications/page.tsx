"use client";

import { useMemo } from "react";
import { useUser, useRealtimeCollection, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, Wallet, Gift, Check, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'investment' | 'withdrawal' | 'deposit' | 'system' | 'referral';
    is_read: boolean;
    created_at: string;
}

export default function NotificationsPage() {
    const { user } = useUser();
    const { toast } = useToast();

    const notificationsOptions = useMemo(() => ({
        table: 'notifications',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    const { data: notifications, isLoading } = useRealtimeCollection<Notification>(notificationsOptions);

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const markAsRead = async (id: string) => {
        try {
            await updateRow('notifications', id, { is_read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!notifications) return;

        const unreadNotifications = notifications.filter(n => !n.is_read);
        await Promise.all(unreadNotifications.map(n => updateRow('notifications', n.id, { is_read: true })));

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
                                    className={`flex items-start gap-4 p-4 border rounded-lg ${!notification.is_read ? 'bg-orange-500/10 border-orange-500/30' : 'border-border'}`}
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
                                    {!notification.is_read && (
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

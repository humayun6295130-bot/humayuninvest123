"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRealtimeCollection } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCommandBar } from "@/components/admin/admin-command-bar";
import { AdminUsersHub } from "@/components/admin/admin-users-hub";
import { AdminFinanceHub } from "@/components/admin/admin-finance-hub";
import { TierSystemManager } from "@/components/admin/tier-system-manager";
import { AdminMonitoringHub } from "@/components/admin/admin-monitoring-hub";
import { SupportManager } from "@/components/admin/support-manager";
import { AdminAnalyticsHub } from "@/components/admin/admin-analytics-hub";
import { BannerManager } from "@/components/admin/banner-manager";
import { PromotionalMessagesManager } from "@/components/admin/promotional-messages-manager";
import { AdminPlatformHub } from "@/components/admin/admin-platform-hub";
import { UserControlPanelUser } from "@/components/admin/user-control-panel";
import {
    UserCog,
    Wallet,
    Layers,
    Pickaxe,
    Headphones,
    LayoutDashboard,
    ImageIcon,
    Megaphone,
    FolderCog,
} from "lucide-react";
import { isValidAdminTab, type AdminTabId } from "@/lib/admin-tabs";

function AdminDashboardInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activeTab = useMemo(() => {
        const raw = searchParams.get("tab");
        return isValidAdminTab(raw) ? raw : "users";
    }, [searchParams]);

    const usersOptions = useMemo(
        () => ({
            table: "users" as const,
            enabled: true,
        }),
        []
    );
    const {
        data: adminUsers,
        isLoading: adminUsersLoading,
        error: adminUsersError,
    } = useRealtimeCollection<UserControlPanelUser>(usersOptions);

    const jump = useCallback(
        (tab: AdminTabId, opts?: { userQuery?: string }) => {
            const p = new URLSearchParams(searchParams.toString());
            p.set("tab", tab);
            const q = opts?.userQuery?.trim();
            if (q) p.set("q", q);
            else if (opts && "userQuery" in opts) p.delete("q");
            router.replace(`${pathname}?${p.toString()}`, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    const onTabChange = useCallback(
        (value: string) => {
            if (!isValidAdminTab(value)) return;
            jump(value);
        },
        [jump]
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin control</h1>
                <p className="text-sm text-muted-foreground">
                    Users, finance, tiers, mining, platform tools (plans, referrals, content, portfolios), support,
                    messages, analytics, and banners. Tabs sync to the URL.
                </p>
            </div>

            <AdminCommandBar onJump={jump} />

            <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
                <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b sm:border-0 sm:static sm:bg-transparent sm:p-0">
                    <TabsList className="flex w-full h-auto min-h-10 flex-nowrap overflow-x-auto gap-1 p-1 justify-start rounded-lg bg-muted/60 sm:flex-wrap sm:overflow-visible">
                        <TabsTrigger value="users" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Finance
                        </TabsTrigger>
                        <TabsTrigger value="tiers" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Tiers
                        </TabsTrigger>
                        <TabsTrigger value="monitoring" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <Pickaxe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Mining
                        </TabsTrigger>
                        <TabsTrigger value="platform" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <FolderCog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Platform
                        </TabsTrigger>
                        <TabsTrigger value="support" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <Headphones className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Support
                        </TabsTrigger>
                        <TabsTrigger value="messages" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Messages
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Stats
                        </TabsTrigger>
                        <TabsTrigger value="banners" className="shrink-0 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm data-[state=active]:bg-background">
                            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Banners
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="users" className="mt-0 focus-visible:outline-none">
                    <AdminUsersHub
                        users={adminUsers ?? []}
                        isLoading={adminUsersLoading}
                        error={adminUsersError}
                    />
                </TabsContent>

                <TabsContent value="finance" className="mt-0 focus-visible:outline-none">
                    <AdminFinanceHub />
                </TabsContent>

                <TabsContent value="tiers" className="mt-0 focus-visible:outline-none">
                    <TierSystemManager />
                </TabsContent>

                <TabsContent value="monitoring" className="mt-0 focus-visible:outline-none">
                    <AdminMonitoringHub />
                </TabsContent>

                <TabsContent value="platform" className="mt-0 focus-visible:outline-none">
                    <AdminPlatformHub />
                </TabsContent>

                <TabsContent value="support" className="mt-0 focus-visible:outline-none">
                    <SupportManager />
                </TabsContent>

                <TabsContent value="messages" className="mt-0 focus-visible:outline-none">
                    <PromotionalMessagesManager />
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
                    <AdminAnalyticsHub />
                </TabsContent>

                <TabsContent value="banners" className="mt-0 focus-visible:outline-none">
                    <BannerManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AdminDashboardFallback() {
    return (
        <div className="flex min-h-[40vh] w-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">Loading admin…</p>
        </div>
    );
}

export function AdminDashboard() {
    return (
        <Suspense fallback={<AdminDashboardFallback />}>
            <AdminDashboardInner />
        </Suspense>
    );
}

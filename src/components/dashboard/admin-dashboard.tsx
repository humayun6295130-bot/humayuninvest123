"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRealtimeCollection } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOverview } from "@/components/admin/admin-overview";
import { UserControlPanel, type UserControlPanelUser } from "@/components/admin/user-control-panel";
import { TransactionManager } from "@/components/admin/transaction-manager";
import { KYCManager } from "@/components/admin/kyc-manager";
import { SupportManager } from "@/components/admin/support-manager";
import { ReferralManager } from "@/components/admin/referral-manager";
import { InvestmentApproval } from "@/components/admin/investment-approval";
import { PaymentVerificationManager } from "@/components/admin/payment-verification-manager";
import { AdminWithdrawalManager } from "@/components/admin/admin-withdrawal-manager";
import { AdminCommandBar } from "@/components/admin/admin-command-bar";
import {
  LayoutDashboard,
  ArrowDownUp,
  ShieldCheck,
  Headphones,
  Gift,
  Wallet,
  UserCog,
  Shield,
  Banknote,
} from "lucide-react";
import { isValidAdminTab, type AdminTabId } from "@/lib/admin-tabs";

function AdminDashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(() => {
    const raw = searchParams.get("tab");
    return isValidAdminTab(raw) ? raw : "overview";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Use the action queue below for daily work. Tabs stay in the URL so you can bookmark a section.
        </p>
      </div>

      <AdminCommandBar onJump={jump} />

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="flex w-full flex-wrap h-auto gap-1 p-1 justify-start">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">User Control</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Verifications</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Withdrawals</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Investments</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Referrals</span>
          </TabsTrigger>
          <TabsTrigger value="kyc" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">KYC</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            <span className="hidden sm:inline">Support</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="users">
          <UserControlPanel
            users={adminUsers}
            isLoading={adminUsersLoading}
            error={adminUsersError}
          />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentVerificationManager />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionManager />
        </TabsContent>

        <TabsContent value="withdrawals">
          <AdminWithdrawalManager />
        </TabsContent>

        <TabsContent value="kyc">
          <KYCManager />
        </TabsContent>

        <TabsContent value="support">
          <SupportManager />
        </TabsContent>

        <TabsContent value="investments">
          <InvestmentApproval />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralManager />
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

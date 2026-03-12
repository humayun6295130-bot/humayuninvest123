"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOverview } from "@/components/admin/admin-overview";
import { UserControlPanel } from "@/components/admin/user-control-panel";
import { TransactionManager } from "@/components/admin/transaction-manager";
import { KYCManager } from "@/components/admin/kyc-manager";
import { SupportManager } from "@/components/admin/support-manager";
import { ReferralManager } from "@/components/admin/referral-manager";
import { InvestmentApproval } from "@/components/admin/investment-approval";
import { PaymentVerificationManager } from "@/components/admin/payment-verification-manager";
import {
  LayoutDashboard,
  Users,
  ArrowDownUp,
  TrendingUp,
  ShieldCheck,
  Headphones,
  Gift,
  Wallet,
  UserCog,
  Shield
} from "lucide-react";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Full control center for platform management</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 lg:w-auto">
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
          <UserControlPanel />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentVerificationManager />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionManager />
        </TabsContent>

        <TabsContent value="kyc">
          <KYCManager />
        </TabsContent>

        <TabsContent value="support">
          <SupportManager />
        </TabsContent>

        <TabsContent value="investments">
          <UserControlPanel />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

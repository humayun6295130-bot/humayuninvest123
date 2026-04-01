"use client";

import { AdminOverview } from "@/components/admin/admin-overview";
import { InvestmentStatsChart } from "@/components/admin/investment-stats-chart";

export function AdminAnalyticsHub() {
    return (
        <div className="space-y-8">
            <AdminOverview />
            <InvestmentStatsChart />
        </div>
    );
}

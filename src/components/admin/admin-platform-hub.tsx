"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlanManager } from "@/components/admin/plan-manager";
import { EnhancedReferralManager } from "@/components/admin/enhanced-referral-manager";
import { AdminReferralRepairPanel } from "@/components/admin/admin-referral-repair-panel";
import { ContentModerationPanel } from "@/components/admin/content-moderation-panel";
import { AdminPortfolioLookup } from "@/components/admin/admin-portfolio-lookup";
import { AdminInvestmentsLookup } from "@/components/admin/admin-investments-lookup";
import { TrendingUp, Users, Newspaper, Briefcase, Pickaxe } from "lucide-react";

/**
 * Tools that existed in the codebase but were not mounted on /admin — members use these areas
 * (invest plans, referrals, content, portfolio) and expect support from here when something breaks.
 */
export function AdminPlatformHub() {
    return (
        <div className="space-y-4">
            <Accordion type="multiple" defaultValue={["plans", "referrals"]} className="w-full space-y-2">
                <AccordionItem value="plans" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                            Investment plans (catalog)
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <PlanManager />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="referrals" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-violet-600 shrink-0" />
                            Referrals, bonuses &amp; team
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0 space-y-4">
                        <AdminReferralRepairPanel />
                        <EnhancedReferralManager />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="content" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <Newspaper className="h-4 w-4 text-sky-600 shrink-0" />
                            Market insights (posts)
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <ContentModerationPanel />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="portfolio" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-amber-600 shrink-0" />
                            Portfolios &amp; assets
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <AdminPortfolioLookup />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="investments" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <Pickaxe className="h-4 w-4 text-orange-600 shrink-0" />
                            Positions by member (lookup + notes)
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <AdminInvestmentsLookup />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

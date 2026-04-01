"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UserControlPanel, type UserControlPanelUser } from "@/components/admin/user-control-panel";
import { KYCManager } from "@/components/admin/kyc-manager";
import { UserCog, ShieldCheck } from "lucide-react";

interface AdminUsersHubProps {
    users: UserControlPanelUser[];
    isLoading: boolean;
    error: Error | null;
}

export function AdminUsersHub({ users, isLoading, error }: AdminUsersHubProps) {
    return (
        <div className="space-y-4">
            <Accordion type="multiple" defaultValue={["users"]} className="w-full space-y-2">
                <AccordionItem value="users" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-primary shrink-0" />
                            Users — list, status &amp; role
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <UserControlPanel users={users} isLoading={isLoading} error={error} />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="kyc" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            KYC review
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <KYCManager />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

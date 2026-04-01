"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PaymentVerificationManager } from "@/components/admin/payment-verification-manager";
import { TransactionManager } from "@/components/admin/transaction-manager";
import { AdminWithdrawalManager } from "@/components/admin/admin-withdrawal-manager";
import { AdminReinvestActivity } from "@/components/admin/admin-reinvest-activity";
import { Banknote, CreditCard, List, RefreshCw } from "lucide-react";

/**
 * Deposit / withdrawal approvals + balance-related transaction list (admin-only).
 */
export function AdminFinanceHub() {
    return (
        <div className="space-y-4">
            <Accordion type="multiple" defaultValue={["proofs", "reinvest", "tx", "wd"]} className="w-full space-y-2">
                <AccordionItem value="reinvest" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-indigo-500 shrink-0" />
                            Re-invest &amp; activity log
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <AdminReinvestActivity />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="proofs" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <List className="h-4 w-4 text-amber-500 shrink-0" />
                            Payment proofs &amp; verification
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <PaymentVerificationManager />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tx" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
                            All transactions
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <TransactionManager />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="wd" className="border rounded-lg px-3 bg-card">
                    <AccordionTrigger className="text-sm sm:text-base hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-green-600 shrink-0" />
                            Balance withdrawals (approve / reject)
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                        <AdminWithdrawalManager />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <p className="text-xs text-muted-foreground px-1">
                Wallet credit/debit with a memo on the member&apos;s transaction history: <strong>Users</strong> tab →{" "}
                <strong>Adjust balance</strong> (scale icon). For setting an exact balance without a history line, use{" "}
                <strong>Edit User</strong>.
            </p>
        </div>
    );
}

import { insertRow } from "@/firebase/database";
import { db } from "@/firebase/config";
import { doc, updateDoc, increment } from "firebase/firestore";

export type FinancialActivityKind = "reinvest" | "withdrawal_request";

/**
 * Append an audit row and bump denormalized counters on the user document for admin reporting.
 */
export async function appendFinancialActivity(opts: {
    user_id: string;
    kind: FinancialActivityKind;
    amount_usd: number;
    plan_id?: string | null;
    plan_name?: string | null;
    source: "user" | "admin";
    note?: string | null;
    linked_transaction_id?: string | null;
}): Promise<void> {
    if (!db) return;

    const now = new Date().toISOString();
    await insertRow("financial_activity_log", {
        user_id: opts.user_id,
        kind: opts.kind,
        amount_usd: opts.amount_usd,
        plan_id: opts.plan_id ?? null,
        plan_name: opts.plan_name ?? null,
        source: opts.source,
        note: opts.note ?? null,
        linked_transaction_id: opts.linked_transaction_id ?? null,
    });

    const userRef = doc(db, "users", opts.user_id);
    if (opts.kind === "reinvest") {
        await updateDoc(userRef, {
            reinvest_count: increment(1),
            reinvest_total_usd: increment(opts.amount_usd),
            updated_at: now,
        });
    } else {
        await updateDoc(userRef, {
            withdrawal_request_count: increment(1),
            withdrawal_request_total_usd: increment(opts.amount_usd),
            updated_at: now,
        });
    }
}

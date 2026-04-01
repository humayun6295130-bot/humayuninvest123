import { insertRow } from "@/firebase/database";
import { db } from "@/firebase/config";
import { doc, getDoc, runTransaction, updateDoc, increment } from "firebase/firestore";
import { resolveDailyIncomeForDeposit } from "@/lib/deposit-income-tiers";
import { distributeInvestmentReferralCommissions } from "@/lib/referral-system";
import { appendFinancialActivity } from "@/lib/financial-activity-log";

export interface ReinvestPlanShape {
    id: string;
    name: string;
    min_amount: number;
    max_amount: number;
    fixed_amount?: number;
    duration_days: number;
    return_percent: number;
    daily_roi_percent: number;
    total_return?: number;
    capital_return?: boolean;
}

export interface ReinvestFromBalanceInput {
    user_id: string;
    user_email: string;
    plan: ReinvestPlanShape;
    amount: number;
    source: "user" | "admin";
    note?: string;
}

/**
 * Deduct main balance, open a new active investment, credit referrals, and log activity.
 */
export async function executeReinvestFromBalance(input: ReinvestFromBalanceInput): Promise<void> {
    if (!db) throw new Error("Firebase is not configured");

    const amt = Number(input.amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Invalid amount");

    const plan = input.plan;
    const min = Number(plan.min_amount) || 0;
    const max = Number(plan.max_amount) || Number.POSITIVE_INFINITY;
    if (amt < min) throw new Error(`Minimum investment for this plan is $${min}`);
    if (amt > max) throw new Error(`Maximum for this plan is $${max}`);

    const userRef = doc(db, "users", input.user_id);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) throw new Error("User not found");
        const bal = Number(snap.data().balance) || 0;
        if (bal < amt) throw new Error("Insufficient wallet balance");
        tx.update(userRef, {
            balance: bal - amt,
            updated_at: new Date().toISOString(),
        });
    });

    const timestamp = new Date().toISOString();
    const durationDays = Number(plan.duration_days) > 0 ? Number(plan.duration_days) : 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const tiered = resolveDailyIncomeForDeposit(amt);
    const daily_roi = tiered.dailyUsd;
    const total_profit = daily_roi * durationDays;
    const total_return = amt + total_profit;

    const ledgerId = `balance-reinvest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    try {
        await insertRow("user_investments", {
            user_id: input.user_id,
            plan_id: plan.id,
            plan_name: plan.name,
            amount: amt,
            daily_roi,
            daily_roi_percent: tiered.incomePercent,
            deposit_tier_level: tiered.tierLevel,
            income_percent: tiered.incomePercent,
            total_return,
            total_profit,
            earned_so_far: 0,
            claimed_so_far: 0,
            days_claimed: 0,
            start_date: timestamp,
            end_date: endDate.toISOString(),
            status: "active",
            auto_compound: false,
            capital_return: true,
            payout_schedule: "end_of_term",
            transaction_hash: ledgerId,
            payment_source: "main_balance_reinvest",
            reinvest: true,
        });

        await insertRow("transactions", {
            user_id: input.user_id,
            type: "reinvest",
            amount: -amt,
            status: "completed",
            description: `Re-invest from balance — ${plan.name}`,
            transaction_hash: ledgerId,
        });

        await updateDoc(userRef, {
            total_invested: increment(amt),
            active_plan: plan.name,
            updated_at: timestamp,
        });

        const userSnap = await getDoc(userRef);
        const display =
            userSnap.exists() && userSnap.data().username
                ? userSnap.data().username
                : input.user_email || "";

        try {
            await distributeInvestmentReferralCommissions(db, input.user_id, amt, display);
        } catch (e) {
            console.error("Reinvest referral (non-fatal):", e);
        }

        await appendFinancialActivity({
            user_id: input.user_id,
            kind: "reinvest",
            amount_usd: amt,
            plan_id: plan.id,
            plan_name: plan.name,
            source: input.source,
            note: input.note ?? null,
            linked_transaction_id: null,
        });
    } catch (e) {
        try {
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(userRef);
                if (!snap.exists()) return;
                const bal = Number(snap.data().balance) || 0;
                tx.update(userRef, { balance: bal + amt, updated_at: new Date().toISOString() });
            });
        } catch (refundErr) {
            console.error("Reinvest refund failed:", refundErr);
        }
        throw e;
    }
}

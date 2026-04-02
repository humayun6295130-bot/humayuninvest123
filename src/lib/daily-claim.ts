import type { Firestore } from "firebase/firestore";
import { doc, increment, writeBatch } from "firebase/firestore";
import { insertRow } from "@/firebase/database";
import { getEffectiveDailyIncomeUsd } from "@/lib/deposit-income-tiers";
import { distributeDailyClaimReferralCommissions } from "@/lib/referral-system";

export const DAILY_CLAIM_ERR = {
    ALREADY_TODAY: "ALREADY_CLAIMED_TODAY",
    NOTHING: "NOTHING_TO_CLAIM",
} as const;

/** UTC calendar day YYYY-MM-DD (matches existing app usage). */
export function getClaimCalendarDayUtc(d = new Date()): string {
    return d.toISOString().split("T")[0];
}

export function hasClaimedDailyToday(lastDailyClaimIso: string | undefined | null): boolean {
    if (!lastDailyClaimIso) return false;
    const today = getClaimCalendarDayUtc();
    const claimDay = lastDailyClaimIso.split("T")[0];
    return claimDay === today;
}

export function computeTotalDailyClaimUsd(investments: unknown[] | null | undefined): number {
    if (!investments?.length) return 0;
    return investments.reduce((sum: number, inv) => {
        const row = inv as { status?: string };
        if (row.status !== "active") return sum;
        return sum + getEffectiveDailyIncomeUsd(inv as never);
    }, 0);
}

export interface UnifiedDailyClaimInput {
    db: Firestore;
    userId: string;
    userProfile: {
        last_daily_claim?: string | null;
        email?: string;
        display_name?: string;
        username?: string;
    };
    /** Active + inactive ok; only `status === 'active'` rows are used. */
    investments: Array<Record<string, unknown> & { id: string; status?: string }>;
}

/**
 * Single source of truth: one successful call per UTC day per user.
 * Updates user balance, last_daily_claim, totals, and every active investment line.
 */
export async function executeUnifiedDailyClaim(input: UnifiedDailyClaimInput): Promise<{
    totalClaimed: number;
    activeCount: number;
}> {
    const { db, userId, userProfile, investments } = input;

    if (hasClaimedDailyToday(userProfile?.last_daily_claim)) {
        throw new Error(DAILY_CLAIM_ERR.ALREADY_TODAY);
    }

    const active = (investments || []).filter((i) => i.status === "active");
    const total = active.reduce((s, inv) => s + getEffectiveDailyIncomeUsd(inv as never), 0);

    if (total <= 0 || active.length === 0) {
        throw new Error(DAILY_CLAIM_ERR.NOTHING);
    }

    const today = getClaimCalendarDayUtc();
    const nowIso = new Date().toISOString();

    const batch = writeBatch(db);
    const userRef = doc(db, "users", userId);
    batch.update(userRef, {
        balance: increment(total),
        last_daily_claim: nowIso,
        updated_at: nowIso,
        total_earnings: increment(total),
        total_earned: increment(total),
    });

    for (const inv of active) {
        const daily = getEffectiveDailyIncomeUsd(inv as never);
        const invRef = doc(db, "user_investments", inv.id);
        const days = Number(inv.days_claimed) || 0;
        const claimed = (Number(inv.claimed_so_far) || 0) + daily;
        const earned = (Number(inv.earned_so_far) || 0) + daily;
        batch.update(invRef, {
            last_claim_date: today,
            days_claimed: days + 1,
            claimed_so_far: claimed,
            earned_so_far: earned,
            updated_at: nowIso,
        });
    }

    await batch.commit();

    await insertRow("transactions", {
        user_id: userId,
        user_email: userProfile?.email,
        user_display_name: userProfile?.display_name,
        type: "daily_claim",
        amount: total,
        currency: "USD",
        status: "completed",
        description: `Daily profit claim — ${active.length} active investment(s)`,
    });

    await insertRow("daily_earnings", {
        user_id: userId,
        amount: total,
        date: today,
        status: "credited",
    });

    for (const inv of active) {
        const daily = getEffectiveDailyIncomeUsd(inv as never);
        await insertRow("investment_earnings", {
            user_id: userId,
            investment_id: inv.id,
            plan_name: String((inv as { plan_name?: string }).plan_name || "Plan"),
            amount: daily,
            date: today,
            claimed_at: nowIso,
        });
    }

    const earnerLabel =
        String(userProfile?.username || userProfile?.display_name || userProfile?.email || "Member").trim() ||
        "Member";
    try {
        await distributeDailyClaimReferralCommissions(db, userId, total, earnerLabel);
    } catch (refErr) {
        console.error("Daily claim referral commissions (non-fatal):", refErr);
    }

    return { totalClaimed: total, activeCount: active.length };
}

/**
 * Deposit amount → daily income % (of principal). Single source for claims + activation.
 * Tier 4 range: L3 ends at $1000; L5 starts at $5000 — bridge 1001–4999 at 3% (adjust if business specifies otherwise).
 */
export interface DepositIncomeTier {
    level: number;
    min: number;
    max: number;
    /** Daily income as % of deposit principal */
    incomePercent: number;
}

export const DEPOSIT_INCOME_TIERS: DepositIncomeTier[] = [
    { level: 1, min: 30, max: 250, incomePercent: 1.5 },
    { level: 2, min: 251, max: 500, incomePercent: 2 },
    { level: 3, min: 501, max: 1000, incomePercent: 2.5 },
    { level: 4, min: 1001, max: 4999, incomePercent: 3 },
    { level: 5, min: 5000, max: 10000, incomePercent: 4 },
];

/** Depth of upline referral commission (separate from deposit tiers). */
export const REFERRAL_COMMISSION_MAX_DEPTH = 3;

export function resolveDailyIncomeForDeposit(amount: number): {
    tierLevel: number;
    incomePercent: number;
    dailyUsd: number;
} {
    const a = Number(amount);
    if (!Number.isFinite(a) || a < DEPOSIT_INCOME_TIERS[0].min) {
        return { tierLevel: 0, incomePercent: 0, dailyUsd: 0 };
    }
    for (const t of DEPOSIT_INCOME_TIERS) {
        if (a >= t.min && a <= t.max) {
            return {
                tierLevel: t.level,
                incomePercent: t.incomePercent,
                dailyUsd: (a * t.incomePercent) / 100,
            };
        }
    }
    if (a > DEPOSIT_INCOME_TIERS[DEPOSIT_INCOME_TIERS.length - 1].max) {
        const pct = DEPOSIT_INCOME_TIERS[DEPOSIT_INCOME_TIERS.length - 1].incomePercent;
        return { tierLevel: 5, incomePercent: pct, dailyUsd: (a * pct) / 100 };
    }
    return { tierLevel: 0, incomePercent: 0, dailyUsd: 0 };
}

/**
 * Always derive daily $ from deposit amount + tier table (fixes legacy wrong daily_roi in Firestore).
 */
export function getEffectiveDailyIncomeUsd(inv: { amount?: number }): number {
    const amt = Number(inv?.amount);
    if (!Number.isFinite(amt) || amt <= 0) return 0;
    return resolveDailyIncomeForDeposit(amt).dailyUsd;
}

export function formatTierSummary(tierLevel: number, incomePercent: number): string {
    if (tierLevel <= 0) return "—";
    return `Tier ${tierLevel} · ${incomePercent}%/day`;
}

/**
 * Deposit amount → daily income % (of principal). Single source for claims + activation.
 * Admin can override rows via Firestore `platform_settings/main.deposit_tiers` (synced in FirebaseProvider + server activation).
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

/** In-memory table used on client after Firestore sync, and as default on server. */
let runtimeTierTable: DepositIncomeTier[] = DEPOSIT_INCOME_TIERS;

function isTierRow(x: unknown): x is DepositIncomeTier {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    return (
        typeof o.level === 'number' &&
        typeof o.min === 'number' &&
        typeof o.max === 'number' &&
        typeof o.incomePercent === 'number' &&
        Number.isFinite(o.min) &&
        Number.isFinite(o.max) &&
        o.min <= o.max &&
        o.incomePercent >= 0 &&
        o.incomePercent <= 100
    );
}

/** Parse Firestore JSON array; returns null if invalid. Levels are renumbered 1..n by sort order. */
export function parseDepositTiersFirestore(value: unknown): DepositIncomeTier[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    const rows = value.filter(isTierRow);
    if (rows.length !== value.length) return null;
    const sorted = [...rows].sort((a, b) => a.min - b.min);
    return sorted.map((t, i) => ({ ...t, level: i + 1 }));
}

/** Client + lib: apply tiers from snapshot (null → reset to built-in defaults). */
export function setClientDepositIncomeTiers(tiers: DepositIncomeTier[] | null | undefined): void {
    const parsed = tiers && tiers.length > 0 ? parseDepositTiersFirestore(tiers) : null;
    runtimeTierTable = parsed ?? DEPOSIT_INCOME_TIERS;
}

export function getClientDepositIncomeTiers(): DepositIncomeTier[] {
    return runtimeTierTable;
}

export function resolveDailyIncomeForDeposit(
    amount: number,
    tierTable: DepositIncomeTier[] = runtimeTierTable
): {
    tierLevel: number;
    incomePercent: number;
    dailyUsd: number;
} {
    const a = Number(amount);
    const table = tierTable.length ? tierTable : DEPOSIT_INCOME_TIERS;
    if (!Number.isFinite(a) || a < table[0].min) {
        return { tierLevel: 0, incomePercent: 0, dailyUsd: 0 };
    }
    for (const t of table) {
        if (a >= t.min && a <= t.max) {
            return {
                tierLevel: t.level,
                incomePercent: t.incomePercent,
                dailyUsd: (a * t.incomePercent) / 100,
            };
        }
    }
    if (a > table[table.length - 1].max) {
        const pct = table[table.length - 1].incomePercent;
        return { tierLevel: table[table.length - 1].level, incomePercent: pct, dailyUsd: (a * pct) / 100 };
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
    if (tierLevel <= 0) return '—';
    return `Tier ${tierLevel} · ${incomePercent}%/day`;
}

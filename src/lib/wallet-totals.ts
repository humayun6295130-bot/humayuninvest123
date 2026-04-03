/**
 * Single source for "how much can the user withdraw" — main wallet + referral_balance.
 */

export function roundMoney2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Credit for referral lines: normal 2-decimal rounding, but if the math is positive yet
 * rounds to $0.00 (typical for small daily-claim % slices), pay at least $0.01 so uplines
 * actually receive something when settings say they earn a non-zero %.
 * Ignores float dust below 1e-8.
 */
export function referralPayoutUsd(raw: number): number {
    const x = Number(raw);
    if (!Number.isFinite(x) || x < 1e-8) return 0;
    const rounded = Math.round(x * 100) / 100;
    if (rounded > 0) return rounded;
    return 0.01;
}

export function getMainBalanceUsd(profile: { balance?: unknown } | null | undefined): number {
    return roundMoney2(Number(profile?.balance) || 0);
}

export function getReferralBalanceUsd(profile: { referral_balance?: unknown } | null | undefined): number {
    return roundMoney2(Number(profile?.referral_balance) || 0);
}

/** Combined pool for one-step withdrawals (wallet + referral earnings). */
export function getWithdrawableUsd(
    profile: { balance?: unknown; referral_balance?: unknown } | null | undefined
): number {
    return roundMoney2(getMainBalanceUsd(profile) + getReferralBalanceUsd(profile));
}

/**
 * Take from referral_balance first, then main balance (matches how earnings were credited).
 */
export function splitWithdrawDeduction(
    totalDeduct: number,
    mainUsd: number,
    referralUsd: number
): { fromMain: number; fromRef: number } {
    const total = roundMoney2(totalDeduct);
    let m = roundMoney2(mainUsd);
    let r = roundMoney2(referralUsd);
    let remaining = total;

    const fromRef = roundMoney2(Math.min(r, remaining));
    remaining = roundMoney2(remaining - fromRef);
    const fromMain = roundMoney2(Math.min(m, remaining));

    if (roundMoney2(fromRef + fromMain) < total) {
        throw new Error("Insufficient combined balance");
    }
    return { fromMain, fromRef };
}

/** Max gross amount user can request (before fee) given fee percent and combined balance. */
export function maxWithdrawRequestAmountUsd(withdrawableUsd: number, feePercent: number): number {
    const mult = 1 + feePercent / 100;
    if (mult <= 0 || withdrawableUsd <= 0) return 0;
    return roundMoney2(Math.min(10_000, withdrawableUsd / mult));
}

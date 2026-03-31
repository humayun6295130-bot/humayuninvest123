/** Shared helpers (safe for client + server). */

export function usdAmountsMatch(expected: number, actual: number | undefined): boolean {
    if (actual === undefined || !Number.isFinite(actual)) return false;
    const tol = Math.max(0.25, expected * 0.03);
    return Math.abs(actual - expected) <= tol;
}

/** NOWPayments: finished = settled; confirmed = on-chain received (often before finished). */
export function isPaymentStatusComplete(status: string | undefined): boolean {
    const s = String(status ?? '').toLowerCase();
    return s === 'finished' || s === 'confirmed';
}

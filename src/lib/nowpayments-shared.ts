/** Shared helpers (safe for client + server). */

/**
 * USD invoice vs NOWPayments `price_amount` (and similar). Use a floor tolerance so small
 * invoices (e.g. $30) still pass when the gateway rounds or applies tiny FX/fees.
 */
export function usdAmountsMatch(expected: number, actual: number | undefined): boolean {
    if (actual === undefined || !Number.isFinite(actual)) return false;
    const e = Math.abs(expected);
    const tol = Math.max(1, e * 0.06);
    return Math.abs(actual - expected) <= tol;
}

/** Prefer fiat invoice amount from NOWPayments GET payment payload. */
export function nowpaymentsPriceAmountUsd(data: Record<string, unknown>): number | undefined {
    const raw = data.price_amount ?? data.outcome_price_amount ?? data.priceAmount;
    const n = typeof raw === 'string' ? Number(raw.trim()) : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * NOWPayments payment_status (see API docs):
 * waiting → confirming → confirmed → sending → finished (also failed/refunded/expired).
 * We treat late-stage statuses as payable so activation is not stuck between confirmed and finished.
 */
export function isPaymentStatusComplete(status: string | undefined): boolean {
    const s = String(status ?? '').toLowerCase();
    return (
        s === 'finished' ||
        s === 'confirmed' ||
        s === 'sending' ||
        s === 'completed' ||
        s === 'success'
    );
}

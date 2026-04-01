/**
 * Stable format shared by client + `/api/nowpayments/create` + verify routes.
 * User must own the id: `inv_<uid>_...`
 */
export function buildInvestmentOrderId(userId: string, planId: string): string {
    const u = String(userId ?? "").trim();
    const p = String(planId ?? "").trim();
    if (!u || !p) return `inv_${Date.now()}`;
    return `inv_${u}_${p}_${Date.now()}`;
}

export function isInvestmentOrderIdForUser(orderId: string, userId: string): boolean {
    const u = String(userId ?? "").trim();
    if (!u || !orderId) return false;
    return orderId.startsWith(`inv_${u}_`);
}

/** NOWPayments wallet top-up — not an investment plan. */
export function buildWalletDepositOrderId(userId: string): string {
    const u = String(userId ?? "").trim();
    if (!u) return `dep_${Date.now()}`;
    return `dep_${u}_${Date.now()}`;
}

export function isWalletDepositOrderIdForUser(orderId: string, userId: string): boolean {
    const u = String(userId ?? "").trim();
    if (!u || !orderId) return false;
    return orderId.startsWith(`dep_${u}_`);
}

export const NOWPAYMENTS_WALLET_PLAN_ID = "wallet_balance" as const;

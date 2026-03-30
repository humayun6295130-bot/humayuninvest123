/**
 * NOWPayments API V1 — server-only (import from Route Handlers only).
 * https://api.nowpayments.io/v1
 */

export const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';

export function getNowpaymentsEnv(): {
    apiKey: string;
    ipnSecret: string;
    payCurrency: string;
} {
    return {
        apiKey: process.env.NOWPAYMENTS_API_KEY?.trim() ?? '',
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET?.trim() ?? '',
        payCurrency: process.env.PAYMENT_CURRENCY?.trim() || 'usdtbe20',
    };
}

export function appPublicBaseUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
    return 'http://localhost:5000';
}

export interface NpPaymentResponse {
    payment_id?: number;
    payment_status?: string;
    pay_address?: string;
    pay_amount?: number;
    pay_currency?: string;
    price_amount?: number;
    price_currency?: string;
    order_id?: string;
    order_description?: string;
    [key: string]: unknown;
}

export async function npCreatePayment(payload: {
    price_amount: number;
    price_currency: string;
    pay_currency: string;
    order_id: string;
    order_description?: string;
    ipn_callback_url?: string;
}): Promise<{ ok: true; data: NpPaymentResponse } | { ok: false; status: number }> {
    const { apiKey } = getNowpaymentsEnv();
    if (!apiKey) {
        return { ok: false, status: 501 };
    }
    const res = await fetch(`${NOWPAYMENTS_API_BASE}/payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as NpPaymentResponse;
    if (!res.ok) {
        return { ok: false, status: res.status };
    }
    return { ok: true, data };
}

export async function npGetPayment(
    paymentId: string | number
): Promise<{ ok: true; data: NpPaymentResponse } | { ok: false; status: number }> {
    const { apiKey } = getNowpaymentsEnv();
    if (!apiKey) {
        return { ok: false, status: 501 };
    }
    const res = await fetch(`${NOWPAYMENTS_API_BASE}/payment/${paymentId}`, {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
        cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as NpPaymentResponse;
    if (!res.ok) {
        return { ok: false, status: res.status };
    }
    return { ok: true, data };
}

/** USD tolerance for matching create vs verify. */
export function usdAmountsMatch(expected: number, actual: number | undefined): boolean {
    if (actual === undefined || !Number.isFinite(actual)) return false;
    const tol = Math.max(0.02, expected * 0.002);
    return Math.abs(actual - expected) <= tol;
}

export function orderIdForUser(userId: string, planId: string): string {
    return `inv_${userId}_${planId}_${Date.now()}`;
}

export function isOrderIdOwnedByUser(orderId: string, userId: string): boolean {
    return orderId.startsWith(`inv_${userId}_`);
}

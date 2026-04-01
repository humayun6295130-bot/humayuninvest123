/**
 * NOWPayments API V1 — server-only (import from Route Handlers only).
 * https://api.nowpayments.io/v1
 */

import { buildInvestmentOrderId, isInvestmentOrderIdForUser } from './investment-order-id';

export const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1';

/**
 * NOWPayments pay_currency tickers are lowercase (e.g. usdtbsc).
 * "usdtbe20" is not a valid ticker — map common mistakes to USDT on BSC.
 */
export function normalizePayCurrency(raw: string): string {
    const s = raw.trim().toLowerCase();
    if (!s) return 'usdtbsc';
    if (s === 'usdtbe20' || s === 'usdtbep20' || s === 'usdt_bep20' || s === 'usdt-bep20') {
        return 'usdtbsc';
    }
    return s;
}

export function getNowpaymentsEnv(): {
    apiKey: string;
    ipnSecret: string;
    payCurrency: string;
} {
    return {
        apiKey: process.env.NOWPAYMENTS_API_KEY?.trim() ?? '',
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET?.trim() ?? '',
        payCurrency: normalizePayCurrency(process.env.PAYMENT_CURRENCY?.trim() || 'usdtbsc'),
    };
}

/**
 * Normalize user-supplied base URL (http/https only, no trailing slash junk).
 */
export function normalizeHttpUrl(raw: string): string | null {
    let s = raw.trim();
    if (!s) return null;

    if (/^localhost(?::\d+)?/i.test(s) || /^127\.\d+\.\d+\.\d+(?::\d+)?/.test(s)) {
        if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    } else if (!/^https?:\/\//i.test(s)) {
        s = 'https://' + s.replace(/^\/+/, '');
    }

    try {
        const u = new URL(s);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        if (!u.hostname) return null;
        const path = u.pathname.replace(/\/+$/, '') || '';
        const origin = `${u.protocol}//${u.host}`;
        return path ? `${origin}${path}` : origin;
    } catch {
        return null;
    }
}

/**
 * Resolved public origin/path for this deployment (never includes a trailing slash before query).
 */
export function getAppPublicBaseUrl(): string | null {
    const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (explicit) {
        return normalizeHttpUrl(explicit);
    }
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) {
        const host = vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!host) return null;
        return `https://${host}`;
    }
    return 'http://localhost:5000';
}

/**
 * IPN callback: single canonical URL, no double slashes (uses URL resolution).
 */
export function buildIpnCallbackUrl(base: string): string {
    const baseWithSlash = base.endsWith('/') ? base : `${base}/`;
    return new URL('api/nowpayments/ipn', baseWithSlash).href;
}

export function getIpnCallbackUrl(): string | null {
    const base = getAppPublicBaseUrl();
    if (!base) return null;
    try {
        const href = buildIpnCallbackUrl(base);
        const u = new URL(href);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        if (!u.hostname) return null;
        return href;
    } catch {
        return null;
    }
}

/**
 * NOWPayments cannot deliver IPN to localhost (no public reachability).
 * Omit ipn_callback_url locally unless overridden — polling still works.
 * Optional: NOWPAYMENTS_IPN_CALLBACK_URL=https://your-ngrok-url/api/nowpayments/ipn
 * Optional: NOWPAYMENTS_ALLOW_LOCAL_IPN=1 to force sending localhost URL (usually still fails at NOWPayments).
 */
export function resolveIpnCallbackUrlForCreate(): string | undefined {
    const override = process.env.NOWPAYMENTS_IPN_CALLBACK_URL?.trim();
    if (override) {
        try {
            const u = new URL(override);
            if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
        } catch {
            /* ignore */
        }
    }

    const built = getIpnCallbackUrl();
    if (!built) return undefined;

    try {
        const u = new URL(built);
        const host = u.hostname.toLowerCase();
        const isLoopback =
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '[::1]' ||
            host.endsWith('.local');

        if (isLoopback && process.env.NOWPAYMENTS_ALLOW_LOCAL_IPN !== '1') {
            return undefined;
        }
        return built;
    } catch {
        return undefined;
    }
}

function extractNowpaymentsErrorMessage(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
    if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
    const errs = d.errors;
    if (Array.isArray(errs) && errs.length > 0 && typeof errs[0] === 'string') return String(errs[0]);
    return undefined;
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
}): Promise<
    | { ok: true; data: NpPaymentResponse }
    | { ok: false; status: number; message?: string }
> {
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
        return {
            ok: false,
            status: res.status,
            message: extractNowpaymentsErrorMessage(data),
        };
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

export { usdAmountsMatch, isPaymentStatusComplete } from './nowpayments-shared';

export function orderIdForUser(userId: string, planId: string): string {
    return buildInvestmentOrderId(userId, planId);
}

export function isOrderIdOwnedByUser(orderId: string, userId: string): boolean {
    return isInvestmentOrderIdForUser(orderId, userId);
}

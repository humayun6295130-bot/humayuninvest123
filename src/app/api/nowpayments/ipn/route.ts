import { NextRequest, NextResponse } from 'next/server';
import { getNowpaymentsEnv } from '@/lib/nowpayments-internal';
import { getAdminFirestore, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { fulfillNowPaymentFromProvider } from '@/lib/nowpayments-fulfill-server';
import { verifyNowpaymentsIpnSignature } from '@/lib/nowpayments-ipn-verify';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nowpayments/ipn
 * Instant Payment Notifications — signature per NOWPayments docs (HMAC-SHA512, sorted JSON keys).
 * When Firebase Admin is configured, fulfills wallet top-up / plan activation even if the user closed the tab.
 */
export async function POST(request: NextRequest) {
    const { ipnSecret } = getNowpaymentsEnv();
    if (!ipnSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 501 });
    }

    const received = request.headers.get('x-nowpayments-sig') ?? '';
    const raw = await request.text();

    let params: Record<string, unknown>;
    try {
        params = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!verifyNowpaymentsIpnSignature(raw, ipnSecret, params, received)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const rawPaymentId = params.payment_id ?? params.id;
    const paymentId =
        rawPaymentId == null
            ? ''
            : String(typeof rawPaymentId === 'number' ? rawPaymentId : String(rawPaymentId).trim());

    if (!paymentId || !/^\d+$/.test(paymentId)) {
        console.warn('nowpayments ipn: missing payment_id', Object.keys(params));
        return NextResponse.json({ ok: true, fulfilled: false, reason: 'no payment_id' });
    }

    if (!isFirebaseAdminConfigured()) {
        console.warn('nowpayments ipn: skip fulfillment (no FIREBASE_SERVICE_ACCOUNT_JSON)');
        return NextResponse.json({ ok: true, fulfilled: false, reason: 'no_admin' });
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
        return NextResponse.json({ ok: true, fulfilled: false, reason: 'admin_db_unavailable' });
    }

    try {
        const result = await fulfillNowPaymentFromProvider(adminDb, paymentId);
        if (!result.ok) {
            console.error('nowpayments ipn fulfill failed:', result.error, { paymentId });
            const retry = result.error === 'payment lookup failed';
            return NextResponse.json(
                { ok: !retry, error: result.error, fulfilled: false },
                { status: retry ? 502 : 200 }
            );
        }
        if (result.action !== 'ignored') {
            console.info('nowpayments ipn:', result.action, { paymentId });
        }
        return NextResponse.json({ ok: true, fulfilled: true, action: result.action });
    } catch (e) {
        console.error('nowpayments ipn:', e);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

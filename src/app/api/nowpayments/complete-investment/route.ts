import { NextRequest, NextResponse } from 'next/server';
import {
    getNowpaymentsEnv,
    isOrderIdOwnedByUser,
    npGetPayment,
    usdAmountsMatch,
    isPaymentStatusComplete,
    nowpaymentsPriceAmountUsd,
} from '@/lib/nowpayments-internal';
import { getAdminAuth, getAdminFirestore, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { activateInvestmentWithAdminDb } from '@/lib/activate-investment-server';
import type { ActivateQrInvestmentParams } from '@/lib/activate-qr-investment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nowpayments/complete-investment
 * Verifies NOWPayments + Firebase ID token, then writes investment via Admin SDK (reliable on Vercel).
 * Set FIREBASE_SERVICE_ACCOUNT_JSON on the server. If unset, client should fall back to client-side activation.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isFirebaseAdminConfigured()) {
            return NextResponse.json(
                { ok: false, error: 'Server investment activation is not configured (missing FIREBASE_SERVICE_ACCOUNT_JSON).' },
                { status: 501 }
            );
        }

        const adminAuth = getAdminAuth();
        const adminDb = getAdminFirestore();
        if (!adminAuth || !adminDb) {
            return NextResponse.json({ ok: false, error: 'Firebase Admin failed to initialize' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization') || '';
        const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!idToken) {
            return NextResponse.json({ ok: false, error: 'Missing Authorization Bearer token' }, { status: 401 });
        }

        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(idToken);
        } catch {
            return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
        }

        const body = (await request.json()) as Record<string, unknown>;
        const userId = String(body.userId ?? '').trim();
        if (!userId || userId !== decoded.uid) {
            return NextResponse.json({ ok: false, error: 'User mismatch' }, { status: 403 });
        }

        const { apiKey } = getNowpaymentsEnv();
        if (!apiKey) {
            return NextResponse.json({ ok: false, error: 'NOWPayments not configured' }, { status: 501 });
        }

        const paymentId = String(body.paymentId ?? '').trim();
        const orderId = String(body.orderId ?? '').trim();
        const expectedUsdAmount = Number(body.expectedUsdAmount);
        const planId = String(body.planId ?? '').trim();
        const planName = String(body.planName ?? 'Plan').slice(0, 200);
        const amount = Number(body.amount);
        const expectedReturn = Number(body.expectedReturn);
        const durationDays = Number(body.durationDays) || 30;
        const dailyRoiPercent = body.dailyRoiPercent != null ? Number(body.dailyRoiPercent) : undefined;
        const returnPercent = body.returnPercent != null ? Number(body.returnPercent) : undefined;
        const userEmail = String(body.userEmail ?? '').trim();
        const transactionId = String(body.transactionId ?? '').trim().toLowerCase();
        const proofImageUrl = body.proofImageUrl == null ? null : String(body.proofImageUrl);
        const payAddress = String(body.payAddress ?? 'NOWPayments');
        const paymentMethod = String(body.paymentMethod ?? 'nowpayments_usdt_bep20');

        if (!paymentId || !/^\d+$/.test(paymentId) || !orderId || !planId) {
            return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
        }
        if (!Number.isFinite(expectedUsdAmount) || expectedUsdAmount <= 0 || !Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
        }
        if (!isOrderIdOwnedByUser(orderId, userId)) {
            return NextResponse.json({ ok: false, error: 'Invalid order' }, { status: 403 });
        }
        if (!transactionId) {
            return NextResponse.json({ ok: false, error: 'Missing transaction id' }, { status: 400 });
        }

        const dupPending = await adminDb
            .collection('pending_investments')
            .where('transaction_id', '==', transactionId)
            .limit(1)
            .get();
        if (!dupPending.empty) {
            return NextResponse.json({ ok: true, alreadyProcessed: true });
        }
        const dupTx = await adminDb
            .collection('transactions')
            .where('transaction_hash', '==', transactionId)
            .limit(1)
            .get();
        if (!dupTx.empty) {
            return NextResponse.json({ ok: true, alreadyProcessed: true });
        }

        const result = await npGetPayment(paymentId);
        if (!result.ok) {
            return NextResponse.json({ ok: false, error: 'Payment lookup failed' }, { status: 502 });
        }

        const d = result.data;
        const status = String(d.payment_status ?? '');
        if (!isPaymentStatusComplete(status)) {
            return NextResponse.json({
                ok: false,
                error: 'Payment is not completed yet',
                payment_status: d.payment_status,
            });
        }

        const remoteOrder = String(d.order_id ?? '');
        if (remoteOrder !== orderId) {
            return NextResponse.json({ ok: false, error: 'Order mismatch' }, { status: 403 });
        }

        const priceAmt =
            nowpaymentsPriceAmountUsd(d as Record<string, unknown>) ?? Number(d.price_amount);
        if (!Number.isFinite(priceAmt) || priceAmt <= 0) {
            return NextResponse.json({ ok: false, error: 'Invalid amount from payment provider' }, { status: 502 });
        }
        if (!usdAmountsMatch(expectedUsdAmount, priceAmt)) {
            return NextResponse.json({ ok: false, error: 'Amount mismatch' }, { status: 403 });
        }

        const activationUsd = priceAmt;
        const ratio = Number.isFinite(amount) && amount > 0 ? activationUsd / amount : 1;
        const scaledExpected = Number.isFinite(expectedReturn)
            ? Math.round(expectedReturn * ratio * 100) / 100
            : activationUsd * 2;

        const params: ActivateQrInvestmentParams = {
            user_id: userId,
            user_email: userEmail || (decoded.email as string) || '',
            plan_id: planId,
            plan_name: planName,
            daily_roi_percent: dailyRoiPercent,
            return_percent: returnPercent,
            amount: activationUsd,
            expected_return: scaledExpected,
            duration_days: durationDays,
            transaction_id: transactionId,
            proof_image_url: proofImageUrl,
            wallet_address: payAddress,
            payment_method: paymentMethod as ActivateQrInvestmentParams['payment_method'],
            notes: 'Auto-verified (NOWPayments, server)',
            order_id: orderId,
        };

        await activateInvestmentWithAdminDb(adminDb, params);

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Activation failed';
        console.error('complete-investment:', e);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

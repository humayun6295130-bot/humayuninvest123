import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
    getNowpaymentsEnv,
    npGetPayment,
    usdAmountsMatch,
    isPaymentStatusComplete,
    nowpaymentsPriceAmountUsd,
} from '@/lib/nowpayments-internal';
import { isWalletDepositOrderIdForUser } from '@/lib/investment-order-id';
import { getAdminAuth, getAdminFirestore, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { MIN_WALLET_DEPOSIT_USD } from '@/lib/wallet-config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nowpayments/complete-deposit
 * Credits wallet balance after NOWPayments confirms a wallet top-up (order id dep_<uid>_...).
 */
export async function POST(request: NextRequest) {
    try {
        if (!isFirebaseAdminConfigured()) {
            return NextResponse.json(
                {
                    ok: false,
                    error: 'Server wallet credit is not configured (missing FIREBASE_SERVICE_ACCOUNT_JSON).',
                },
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
        const userEmail = String(body.userEmail ?? '').trim();
        const payAddress = String(body.payAddress ?? 'NOWPayments');
        const transactionId = String(body.transactionId ?? '').trim().toLowerCase();

        if (!paymentId || !/^\d+$/.test(paymentId) || !orderId) {
            return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
        }
        if (!Number.isFinite(expectedUsdAmount) || expectedUsdAmount <= 0) {
            return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
        }
        if (expectedUsdAmount < MIN_WALLET_DEPOSIT_USD) {
            return NextResponse.json(
                { ok: false, error: `Minimum wallet deposit is $${MIN_WALLET_DEPOSIT_USD}` },
                { status: 400 }
            );
        }
        if (!isWalletDepositOrderIdForUser(orderId, userId)) {
            return NextResponse.json({ ok: false, error: 'Invalid wallet deposit order' }, { status: 403 });
        }
        const txKey = transactionId || `np_${paymentId}`.toLowerCase();
        if (!txKey) {
            return NextResponse.json({ ok: false, error: 'Missing transaction id' }, { status: 400 });
        }

        const dupTx = await adminDb
            .collection('transactions')
            .where('transaction_hash', '==', txKey)
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

        const creditUsd = priceAmt;
        if (creditUsd < MIN_WALLET_DEPOSIT_USD) {
            return NextResponse.json(
                { ok: false, error: `Minimum wallet deposit is $${MIN_WALLET_DEPOSIT_USD}` },
                { status: 400 }
            );
        }
        const nowIso = new Date().toISOString();

        const batch = adminDb.batch();
        const userRef = adminDb.collection('users').doc(userId);
        batch.update(userRef, {
            balance: FieldValue.increment(creditUsd),
            updated_at: nowIso,
        });

        const txRef = adminDb.collection('transactions').doc();
        batch.set(txRef, {
            user_id: userId,
            user_email: userEmail || (decoded.email as string) || '',
            type: 'deposit',
            amount: creditUsd,
            currency: 'USD',
            status: 'completed',
            description: 'Deposit — NOWPayments (wallet top-up)',
            transaction_hash: txKey,
            payment_method: 'nowpayments_usdt_bep20',
            wallet_address: payAddress,
            order_id: orderId,
            nowpayments_payment_id: paymentId,
            created_at: nowIso,
        });

        await batch.commit();

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Deposit failed';
        console.error('complete-deposit:', e);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

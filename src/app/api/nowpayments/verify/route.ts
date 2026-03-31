import { NextRequest, NextResponse } from 'next/server';
import {
    getNowpaymentsEnv,
    isOrderIdOwnedByUser,
    npGetPayment,
    usdAmountsMatch,
    isPaymentStatusComplete,
} from '@/lib/nowpayments-internal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nowpayments/verify
 * Confirms payment is finished and matches order/user/amount before client-side activation.
 */
export async function POST(request: NextRequest) {
    try {
        const { apiKey } = getNowpaymentsEnv();
        if (!apiKey) {
            return NextResponse.json({ valid: false, error: 'Not configured' }, { status: 501 });
        }

        const body = await request.json();
        const paymentId = String(body.paymentId ?? '').trim();
        const orderId = String(body.orderId ?? '').trim();
        const userId = String(body.userId ?? '').trim();
        const expectedUsdAmount = Number(body.expectedUsdAmount);

        if (!paymentId || !/^\d+$/.test(paymentId) || !orderId || !userId) {
            return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
        }
        if (!Number.isFinite(expectedUsdAmount) || expectedUsdAmount <= 0) {
            return NextResponse.json({ valid: false, error: 'Invalid amount' }, { status: 400 });
        }
        if (!isOrderIdOwnedByUser(orderId, userId)) {
            return NextResponse.json({ valid: false, error: 'Invalid order' }, { status: 403 });
        }

        const result = await npGetPayment(paymentId);
        if (!result.ok) {
            return NextResponse.json({ valid: false, error: 'Verification failed' }, { status: 502 });
        }

        const d = result.data;
        const status = String(d.payment_status ?? '');
        if (!isPaymentStatusComplete(status)) {
            return NextResponse.json({
                valid: false,
                error: 'Payment is not completed',
                payment_status: d.payment_status,
            });
        }

        const remoteOrder = String(d.order_id ?? '');
        if (remoteOrder !== orderId) {
            return NextResponse.json({ valid: false, error: 'Order mismatch' }, { status: 403 });
        }

        const priceAmt = Number(d.price_amount);
        if (!usdAmountsMatch(expectedUsdAmount, priceAmt)) {
            return NextResponse.json({ valid: false, error: 'Amount mismatch' }, { status: 403 });
        }

        return NextResponse.json({ valid: true, payment_status: d.payment_status });
    } catch {
        return NextResponse.json({ valid: false, error: 'Verification failed' }, { status: 500 });
    }
}

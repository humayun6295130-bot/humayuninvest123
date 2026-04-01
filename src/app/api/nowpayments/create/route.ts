import { NextRequest, NextResponse } from 'next/server';
import {
    getNowpaymentsEnv,
    npCreatePayment,
    orderIdForUser,
    resolveIpnCallbackUrlForCreate,
} from '@/lib/nowpayments-internal';
import { isInvestmentOrderIdForUser } from '@/lib/investment-order-id';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nowpayments/create
 * Body: { priceAmount: number, planId: string, planName: string, userId: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { apiKey } = getNowpaymentsEnv();
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Payment provider is not configured' },
                { status: 501 }
            );
        }

        const body = await request.json();
        const priceAmount = Number(body.priceAmount);
        const planId = String(body.planId ?? '').trim();
        const planName = String(body.planName ?? 'Investment').slice(0, 200);
        const userId = String(body.userId ?? '').trim();

        if (!userId || !planId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!Number.isFinite(priceAmount) || priceAmount <= 0 || priceAmount > 1_000_000) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const { payCurrency } = getNowpaymentsEnv();
        const clientSuggested = String(body.order_id ?? body.orderId ?? '').trim();
        const generated = orderIdForUser(userId, planId);
        const order_id =
            clientSuggested && isInvestmentOrderIdForUser(clientSuggested, userId)
                ? clientSuggested
                : generated;
        const ipn_callback_url = resolveIpnCallbackUrlForCreate();

        const created = await npCreatePayment({
            price_amount: priceAmount,
            price_currency: 'usd',
            pay_currency: payCurrency,
            order_id,
            order_description: `Investment: ${planName}`,
            ...(ipn_callback_url ? { ipn_callback_url } : {}),
        });

        if (!created.ok) {
            const upstream = created.message?.trim();
            let error = upstream
                ? `Could not create payment: ${upstream}`
                : 'Could not create payment.';
            if (created.status === 401 || created.status === 403) {
                error += ' Verify NOWPAYMENTS_API_KEY on the server.';
            }
            return NextResponse.json({ error }, { status: created.status >= 500 ? 502 : 400 });
        }

        const d = created.data;
        return NextResponse.json({
            payment_id: d.payment_id,
            payment_status: d.payment_status,
            pay_address: d.pay_address,
            pay_amount: d.pay_amount,
            pay_currency: d.pay_currency,
            price_amount: d.price_amount,
            price_currency: d.price_currency,
            order_id: d.order_id ?? order_id,
        });
    } catch {
        return NextResponse.json({ error: 'Request failed' }, { status: 500 });
    }
}

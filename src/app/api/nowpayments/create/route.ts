import { NextRequest, NextResponse } from 'next/server';
import {
    getIpnCallbackUrl,
    getNowpaymentsEnv,
    npCreatePayment,
    orderIdForUser,
} from '@/lib/nowpayments-internal';

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
        const order_id = orderIdForUser(userId, planId);
        const ipn_callback_url = getIpnCallbackUrl();
        if (!ipn_callback_url) {
            return NextResponse.json(
                {
                    error:
                        'Invalid public URL. Set NEXT_PUBLIC_BASE_URL to a valid http(s) URL (no extra slashes).',
                },
                { status: 400 }
            );
        }

        const created = await npCreatePayment({
            price_amount: priceAmount,
            price_currency: 'usd',
            pay_currency: payCurrency,
            order_id,
            order_description: `Investment: ${planName}`,
            ipn_callback_url,
        });

        if (!created.ok) {
            return NextResponse.json({ error: 'Could not create payment' }, { status: 502 });
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

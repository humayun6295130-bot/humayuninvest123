import { NextRequest, NextResponse } from 'next/server';
import { getNowpaymentsEnv, npGetPayment } from '@/lib/nowpayments-internal';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nowpayments/payment/:id
 * Proxies payment status (no API key exposed to the client).
 */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { apiKey } = getNowpaymentsEnv();
        if (!apiKey) {
            return NextResponse.json({ error: 'Not configured' }, { status: 501 });
        }

        const { id } = await context.params;
        if (!id || !/^\d+$/.test(id)) {
            return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 });
        }

        const result = await npGetPayment(id);
        if (!result.ok) {
            return NextResponse.json({ error: 'Status unavailable' }, { status: 502 });
        }

        const d = result.data;
        return NextResponse.json({
            payment_id: d.payment_id,
            payment_status: d.payment_status,
            pay_address: d.pay_address,
            pay_amount: d.pay_amount,
            pay_currency: d.pay_currency,
            price_amount: d.price_amount,
            price_currency: d.price_currency,
            order_id: d.order_id,
        });
    } catch {
        return NextResponse.json({ error: 'Request failed' }, { status: 500 });
    }
}

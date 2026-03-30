import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getNowpaymentsEnv } from '@/lib/nowpayments-internal';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nowpayments/ipn
 * Instant Payment Notifications — signature per NOWPayments docs (HMAC-SHA512, sorted JSON keys).
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

    const sortedKeys = Object.keys(params).sort();
    const sortedJson = JSON.stringify(params, sortedKeys);
    const hmac = crypto.createHmac('sha512', ipnSecret).update(sortedJson).digest('hex');

    if (hmac !== received) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
}

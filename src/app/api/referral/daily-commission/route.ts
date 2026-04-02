import { NextRequest, NextResponse } from 'next/server';
import { processDailyCommissions } from '@/lib/referral-system';

export const dynamic = 'force-dynamic';

function assertCronAuthorized(request: NextRequest): NextResponse | null {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) return null;
    const auth = request.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}

/** Legacy batch job over `referrals.daily_profit` (often unused). Per-claim uplines use client `distributeDailyClaimReferralCommissions`. */
export async function POST(request: NextRequest) {
    const denied = assertCronAuthorized(request);
    if (denied) return denied;

    try {
        console.log('Starting legacy referral daily_commission batch...');

        const results = await processDailyCommissions();

        console.log(`Legacy batch done: processed=${results.processed}, total USD≈${results.totalCommission.toFixed(2)}, errors=${results.errors.length}`);

        if (results.errors.length > 0) {
            console.error('Errors:', results.errors);
        }

        return NextResponse.json({
            success: true,
            processed: results.processed,
            totalCommission: results.totalCommission,
            errors: results.errors
        });
    } catch (error: any) {
        console.error('❌ Error processing daily commissions:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

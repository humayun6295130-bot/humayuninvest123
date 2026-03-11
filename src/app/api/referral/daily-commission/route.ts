import { NextResponse } from 'next/server';
import { processDailyCommissions } from '@/lib/referral-system';

export async function POST() {
    try {
        console.log('🔄 Starting daily commission processing...');

        const results = await processDailyCommissions();

        console.log(`✅ Daily commission processing complete:`);
        console.log(`   - Processed: ${results.processed} referrals`);
        console.log(`   - Total Commission: ${results.totalCommission.toFixed(4)} BTC`);
        console.log(`   - Errors: ${results.errors.length}`);

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

// Also allow GET for manual triggering
export async function GET() {
    return POST();
}

import { NextRequest, NextResponse } from 'next/server';
import { getUSDTTransferEvents, USDT_CONTRACT } from '@/lib/tron';

/**
 * GET /api/tron/events
 * 
 * Get USDT Transfer events from the smart contract
 * 
 * Query params:
 * - limit: number of events (default: 20)
 * - minBlockTimestamp: minimum block timestamp in ms
 * - maxBlockTimestamp: maximum block timestamp in ms
 * - eventName: specific event name (default: 'Transfer')
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const minBlockTimestamp = searchParams.get('minBlockTimestamp')
            ? parseInt(searchParams.get('minBlockTimestamp')!)
            : undefined;
        const maxBlockTimestamp = searchParams.get('maxBlockTimestamp')
            ? parseInt(searchParams.get('maxBlockTimestamp')!)
            : undefined;
        const eventName = searchParams.get('eventName') || 'Transfer';

        const events = await getUSDTTransferEvents({
            limit,
            minBlockTimestamp,
            maxBlockTimestamp,
        });

        return NextResponse.json({
            success: true,
            contractAddress: USDT_CONTRACT,
            eventName,
            count: events.length,
            data: events,
        });
    } catch (error: any) {
        console.error('Contract events fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch contract events' },
            { status: 500 }
        );
    }
}

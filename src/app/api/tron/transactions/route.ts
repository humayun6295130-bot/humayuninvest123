import { NextRequest, NextResponse } from 'next/server';
import {
    getTransactionHistory,
    getIncomingTransactions,
    getOutgoingTransactions,
    isValidTronAddress,
} from '@/lib/tron';

/**
 * GET /api/tron/transactions?address=...&type=...&limit=...
 * 
 * Get transaction history for a TRON address
 * 
 * Query params:
 * - address: TRON address (required)
 * - type: 'all' | 'incoming' | 'outgoing' (default: 'all')
 * - limit: number of transactions (default: 20)
 * - startTime: start timestamp in ms
 * - endTime: end timestamp in ms
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const type = searchParams.get('type') || 'all';
        const limit = parseInt(searchParams.get('limit') || '20');
        const startTime = searchParams.get('startTime')
            ? parseInt(searchParams.get('startTime')!)
            : undefined;
        const endTime = searchParams.get('endTime')
            ? parseInt(searchParams.get('endTime')!)
            : undefined;

        if (!address) {
            return NextResponse.json(
                { error: 'Address parameter is required' },
                { status: 400 }
            );
        }

        if (!isValidTronAddress(address)) {
            return NextResponse.json(
                { error: 'Invalid TRON address format' },
                { status: 400 }
            );
        }

        let transactions;
        const options = { limit, startTime, endTime };

        switch (type) {
            case 'incoming':
                transactions = await getIncomingTransactions(address, options);
                break;
            case 'outgoing':
                transactions = await getOutgoingTransactions(address, options);
                break;
            case 'all':
            default:
                transactions = await getTransactionHistory(address, options);
                break;
        }

        return NextResponse.json({
            success: true,
            address,
            type,
            count: transactions.length,
            data: transactions,
        });
    } catch (error: any) {
        console.error('Transaction history fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch transaction history' },
            { status: 500 }
        );
    }
}

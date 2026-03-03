import { NextRequest, NextResponse } from 'next/server';
import {
    getWalletInfo,
    getTrxBalance,
    getUSDTBalance,
    getAllTokenBalances,
    isValidTronAddress,
} from '@/lib/tron';

/**
 * GET /api/tron/balance?address=...
 * 
 * Get wallet balance for a TRON address
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const token = searchParams.get('token'); // 'all', 'trx', 'usdt', or 'tokens'

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

        let data;

        switch (token) {
            case 'trx':
                data = { trx: await getTrxBalance(address) };
                break;
            case 'usdt':
                data = { usdt: await getUSDTBalance(address) };
                break;
            case 'tokens':
                data = { tokens: await getAllTokenBalances(address) };
                break;
            case 'all':
            default:
                data = await getWalletInfo(address);
                break;
        }

        return NextResponse.json({
            success: true,
            address,
            data,
        });
    } catch (error: any) {
        console.error('Balance fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch balance' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import {
    calculateTransactionFee,
    isValidTronAddress,
} from '@/lib/tron';

/**
 * POST /api/tron/fee
 * 
 * Calculate network fee for a transaction
 * 
 * Body: {
 *   fromAddress: string;
 *   toAddress: string;
 *   amount: number;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fromAddress, toAddress, amount } = body;

        // Validate required fields
        if (!fromAddress || !toAddress || amount === undefined) {
            return NextResponse.json(
                { error: 'fromAddress, toAddress, and amount are required' },
                { status: 400 }
            );
        }

        // Validate addresses
        if (!isValidTronAddress(fromAddress)) {
            return NextResponse.json(
                { error: 'Invalid fromAddress format' },
                { status: 400 }
            );
        }

        if (!isValidTronAddress(toAddress)) {
            return NextResponse.json(
                { error: 'Invalid toAddress format' },
                { status: 400 }
            );
        }

        // Calculate fee
        const fee = await calculateTransactionFee(fromAddress, toAddress, amount);

        return NextResponse.json({
            success: true,
            data: {
                fromAddress,
                toAddress,
                amount,
                fee,
            },
        });
    } catch (error: any) {
        console.error('Fee calculation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to calculate fee' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/tron/fee
 * 
 * Get general fee information for TRON network
 */
export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            success: true,
            data: {
                bandwidth: {
                    averagePerTransaction: 250,
                    freeDaily: 600,
                },
                energy: {
                    averagePerUSDTTransfer: 65000,
                },
                estimatedCosts: {
                    bandwidthOnly: 'Free (if within daily limit)',
                    energyOnly: 'Staked TRX or burned TRX',
                    trc20Transfer: '6-15 TRX (depending on account resources)',
                },
                notes: [
                    'Free bandwidth quota: 600 per day per account',
                    'Energy is obtained by staking TRX',
                    'Insufficient resources will burn TRX as transaction fee',
                ],
            },
        });
    } catch (error: any) {
        console.error('Fee info error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get fee info' },
            { status: 500 }
        );
    }
}

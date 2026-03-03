import { NextRequest, NextResponse } from 'next/server';
import {
    verifyUSDTTransfer,
    checkConfirmations,
    isValidTransactionHash,
    isValidTronAddress,
    markTransactionProcessed,
} from '@/lib/tron';

/**
 * POST /api/tron/verify
 * 
 * Verify a USDT transfer transaction on the TRON blockchain
 * 
 * Body: {
 *   txID: string;
 *   expectedToAddress?: string;
 *   expectedAmount?: number;
 *   minConfirmations?: number;
 *   markAsProcessed?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            txID,
            expectedToAddress,
            expectedAmount,
            minConfirmations = 19,
            markAsProcessed = false,
        } = body;

        // Validate required fields
        if (!txID) {
            return NextResponse.json(
                { error: 'Transaction ID (txID) is required' },
                { status: 400 }
            );
        }

        // Validate transaction hash format
        if (!isValidTransactionHash(txID)) {
            return NextResponse.json(
                { error: 'Invalid transaction hash format' },
                { status: 400 }
            );
        }

        // Validate address if provided
        if (expectedToAddress && !isValidTronAddress(expectedToAddress)) {
            return NextResponse.json(
                { error: 'Invalid expectedToAddress format' },
                { status: 400 }
            );
        }

        // Get admin wallet address
        const adminWalletAddress = expectedToAddress || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

        if (!adminWalletAddress) {
            return NextResponse.json(
                { error: 'Admin wallet address not configured' },
                { status: 500 }
            );
        }

        // Verify the transaction
        const verification = await verifyUSDTTransfer(
            txID,
            adminWalletAddress,
            expectedAmount
        );

        // Get confirmation details
        const confirmationCheck = await checkConfirmations(txID, minConfirmations);

        // Mark as processed if requested and verification is successful
        if (markAsProcessed && verification.valid) {
            markTransactionProcessed(txID);
        }

        return NextResponse.json({
            success: true,
            data: {
                txID,
                valid: verification.valid,
                tx: verification.tx,
                error: verification.error,
                confirmations: confirmationCheck.confirmations,
                confirmed: confirmationCheck.confirmed,
                sufficientConfirmations: confirmationCheck.sufficient,
            },
        });
    } catch (error: any) {
        console.error('Transaction verification error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to verify transaction' },
            { status: 500 }
        );
    }
}

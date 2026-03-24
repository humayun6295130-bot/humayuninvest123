import { NextRequest, NextResponse } from 'next/server';
import {
    createWithdrawalRequest,
    approveWithdrawal,
    rejectWithdrawal,
    completeWithdrawal,
    checkWithdrawalEligibility,
    detectSuspiciousActivity
} from '@/lib/payment-system';

// ============================================================================
// CREATE WITHDRAWAL REQUEST
// ============================================================================

/**
 * POST /api/withdrawals
 * 
 * Create a new withdrawal request
 * 
 * Body: {
 *   amount: number;
 *   walletAddress: string;
 *   network?: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Get user from session (simplified - in real app, use proper auth)
        const userId = request.headers.get('x-user-id') || '';
        const userEmail = request.headers.get('x-user-email') || '';
        const userDisplayName = request.headers.get('x-user-name') || undefined;
        const ipAddress = request.headers.get('x-forwarded-for') || undefined;

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { amount, walletAddress, network = 'trc20' } = body;

        // Validate required fields
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: 'Valid amount is required' },
                { status: 400 }
            );
        }

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        // Check eligibility
        const eligibility = await checkWithdrawalEligibility(userId, amount);
        if (!eligibility.eligible) {
            return NextResponse.json(
                { error: eligibility.reasons.join(', ') },
                { status: 400 }
            );
        }

        // Detect suspicious activity
        const suspicious = await detectSuspiciousActivity(userId, amount, ipAddress);
        if (suspicious.suspicious) {
            console.log('Suspicious activity detected:', suspicious.reasons);
            // Still allow but log for review
        }

        // Create withdrawal request
        const result = await createWithdrawalRequest(
            userId,
            userEmail,
            userDisplayName,
            amount,
            walletAddress,
            network,
            { ipAddress }
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Withdrawal request submitted',
            withdrawal: result.withdrawal,
        });

    } catch (error: any) {
        console.error('Withdrawal request error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create withdrawal request' },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET WITHDRAWALS LIST
// ============================================================================

/**
 * GET /api/withdrawals?status=pending&userId=xxx
 * 
 * Get withdrawal requests list
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const userId = searchParams.get('userId') || undefined;

        // For now, return empty list - in real app, query database
        // This would use getWithdrawals() function from payment-system.ts

        return NextResponse.json({
            success: true,
            withdrawals: [],
            message: 'Use admin dashboard for full withdrawal list',
        });

    } catch (error: any) {
        console.error('Get withdrawals error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

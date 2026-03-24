import { NextRequest, NextResponse } from 'next/server';
import {
    createProfitWithdrawal,
    createPrincipalWithdrawal,
    calculateDepositProfit,
    getUserBalance,
    WITHDRAWAL_CONFIG
} from '@/lib/investment-withdrawal';

// ============================================================================
// PROFIT WITHDRAWAL - User creates withdrawal request
// ============================================================================

/**
 * POST /api/investment/withdraw
 * 
 * Create profit withdrawal request
 * 
 * Body: {
 *   amount: number;
 *   walletAddress: string;
 *   network?: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
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

        // Check minimum withdrawal
        if (amount < WITHDRAWAL_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
            return NextResponse.json(
                {
                    error: `Minimum withdrawal is $${WITHDRAWAL_CONFIG.MIN_WITHDRAWAL_AMOUNT}`,
                    minAmount: WITHDRAWAL_CONFIG.MIN_WITHDRAWAL_AMOUNT
                },
                { status: 400 }
            );
        }

        // Check maximum withdrawal
        if (amount > WITHDRAWAL_CONFIG.MAX_WITHDRAWAL_AMOUNT) {
            return NextResponse.json(
                {
                    error: `Maximum withdrawal is $${WITHDRAWAL_CONFIG.MAX_WITHDRAWAL_AMOUNT}`,
                    maxAmount: WITHDRAWAL_CONFIG.MAX_WITHDRAWAL_AMOUNT
                },
                { status: 400 }
            );
        }

        // Create profit withdrawal request
        const result = await createProfitWithdrawal(
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
            message: 'Profit withdrawal request submitted',
            withdrawal: result.withdrawal,
            info: {
                type: 'profit_withdrawal',
                description: 'Only profit earnings are withdrawable. Principal deposits are locked.',
            }
        });

    } catch (error: any) {
        console.error('Profit withdrawal error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create withdrawal' },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET USER PROFIT INFO
// ============================================================================

/**
 * GET /api/investment/withdraw?userId=xxx
 * 
 * Get user profit balance and withdrawal eligibility
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Get user balance
        const balance = await getUserBalance(userId);

        // Get deposit levels for reference
        const levels = [
            { level: 1, name: 'Starter', range: '$30-$250', daily: '1.5%' },
            { level: 2, name: 'Silver', range: '$251-$500', daily: '2.0%' },
            { level: 3, name: 'Gold', range: '$501-$1000', daily: '2.5%' },
            { level: 4, name: 'Platinum', range: '$1001-$2500', daily: '3.1%' },
            { level: 5, name: 'Diamond', range: '$5000-$10000', daily: '4.0%' },
        ];

        return NextResponse.json({
            success: true,
            data: {
                balance: balance || { total_profit: 0, total_deposits: 0 },
                withdrawalLimits: {
                    min: WITHDRAWAL_CONFIG.MIN_WITHDRAWAL_AMOUNT,
                    max: WITHDRAWAL_CONFIG.MAX_WITHDRAWAL_AMOUNT,
                    daily: WITHDRAWAL_CONFIG.DAILY_WITHDRAWAL_LIMIT,
                },
                rules: {
                    principalLocked: WITHDRAWAL_CONFIG.LOCK_PRINCIPAL,
                    profitWithdrawable: WITHDRAWAL_CONFIG.ALLOW_PROFIT_WITHDRAWAL,
                },
                levels,
            },
            message: balance
                ? 'Use your profit balance for withdrawals. Principal deposits are locked.'
                : 'No balance found. Make deposits to start earning.'
        });

    } catch (error: any) {
        console.error('Get profit info error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

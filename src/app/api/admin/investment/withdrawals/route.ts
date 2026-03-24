import { NextRequest, NextResponse } from 'next/server';
import {
    approveWithdrawal,
    rejectWithdrawal,
    completeWithdrawal
} from '@/lib/investment-withdrawal';

// ============================================================================
// ADMIN: APPROVE PROFIT WITHDRAWAL
// ============================================================================

/**
 * POST /api/admin/investment/withdrawals?action=approve
 * 
 * Body: {
 *   withdrawalId: string;
 *   notes?: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || '';

        const adminId = request.headers.get('x-admin-id') || 'admin';
        const adminEmail = request.headers.get('x-admin-email') || 'admin@example.com';
        const ipAddress = request.headers.get('x-forwarded-for') || undefined;

        const body = await request.json();
        const { withdrawalId, notes, reason, transactionHash } = body;

        if (!withdrawalId) {
            return NextResponse.json(
                { error: 'Withdrawal ID is required' },
                { status: 400 }
            );
        }

        let result;

        switch (action) {
            case 'approve':
                if (!withdrawalId) {
                    return NextResponse.json({ error: 'Withdrawal ID required' }, { status: 400 });
                }
                result = await approveWithdrawal(
                    withdrawalId,
                    adminId,
                    adminEmail,
                    { notes, ipAddress }
                );
                break;

            case 'reject':
                if (!withdrawalId || !reason) {
                    return NextResponse.json({ error: 'Withdrawal ID and reason required' }, { status: 400 });
                }
                result = await rejectWithdrawal(
                    withdrawalId,
                    adminId,
                    adminEmail,
                    reason,
                    { ipAddress }
                );
                break;

            case 'complete':
                if (!withdrawalId || !transactionHash) {
                    return NextResponse.json({ error: 'Withdrawal ID and transaction hash required' }, { status: 400 });
                }
                result = await completeWithdrawal(
                    withdrawalId,
                    adminId,
                    adminEmail,
                    transactionHash,
                    { notes, ipAddress }
                );
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: approve, reject, complete' },
                    { status: 400 }
                );
        }

        if (!result?.success) {
            return NextResponse.json(
                { error: result?.message || 'Action failed' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Withdrawal ${action}ed successfully`,
            action,
        });

    } catch (error: any) {
        console.error('Admin withdrawal action error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process action' },
            { status: 500 }
        );
    }
}

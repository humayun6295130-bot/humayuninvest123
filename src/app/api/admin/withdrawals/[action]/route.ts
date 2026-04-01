import { NextRequest, NextResponse } from 'next/server';
import {
    approveWithdrawal,
    rejectWithdrawal,
    completeWithdrawal,
    markTransactionVerified,
} from '@/lib/payment-system';

// ============================================================================
// ADMIN: APPROVE WITHDRAWAL
// ============================================================================

/**
 * POST /api/admin/withdrawals/approve
 * 
 * Body: {
 *   withdrawalId: string;
 *   notes?: string;
 * }
 */
async function approveRequest(request: NextRequest) {
    try {
        // Get admin info from headers (in real app, use proper auth)
        const adminId = request.headers.get('x-admin-id') || 'admin';
        const adminEmail = request.headers.get('x-admin-email') || 'admin@example.com';
        const ipAddress = request.headers.get('x-forwarded-for') || undefined;

        const body = await request.json();
        const { withdrawalId, notes } = body;

        if (!withdrawalId) {
            return NextResponse.json(
                { error: 'Withdrawal ID is required' },
                { status: 400 }
            );
        }

        const result = await approveWithdrawal(
            withdrawalId,
            adminId,
            adminEmail,
            { notes, ipAddress }
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Withdrawal approved successfully',
        });

    } catch (error: any) {
        console.error('Approve withdrawal error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to approve withdrawal' },
            { status: 500 }
        );
    }
}

// ============================================================================
// ADMIN: REJECT WITHDRAWAL
// ============================================================================

/**
 * POST /api/admin/withdrawals/reject
 * 
 * Body: {
 *   withdrawalId: string;
 *   reason: string;
 * }
 */
async function rejectRequest(request: NextRequest) {
    try {
        const adminId = request.headers.get('x-admin-id') || 'admin';
        const adminEmail = request.headers.get('x-admin-email') || 'admin@example.com';
        const ipAddress = request.headers.get('x-forwarded-for') || undefined;

        const body = await request.json();
        const { withdrawalId, reason } = body;

        if (!withdrawalId) {
            return NextResponse.json(
                { error: 'Withdrawal ID is required' },
                { status: 400 }
            );
        }

        if (!reason) {
            return NextResponse.json(
                { error: 'Rejection reason is required' },
                { status: 400 }
            );
        }

        const result = await rejectWithdrawal(
            withdrawalId,
            adminId,
            adminEmail,
            reason,
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
            message: 'Withdrawal rejected',
        });

    } catch (error: any) {
        console.error('Reject withdrawal error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reject withdrawal' },
            { status: 500 }
        );
    }
}

// ============================================================================
// ADMIN: COMPLETE WITHDRAWAL
// ============================================================================

/**
 * POST /api/admin/withdrawals/complete
 * 
 * Body: {
 *   withdrawalId: string;
 *   transactionHash: string;
 *   notes?: string;
 * }
 */
async function completeRequest(request: NextRequest) {
    try {
        const adminId = request.headers.get('x-admin-id') || 'admin';
        const adminEmail = request.headers.get('x-admin-email') || 'admin@example.com';
        const ipAddress = request.headers.get('x-forwarded-for') || undefined;

        const body = await request.json();
        const { withdrawalId, transactionHash, notes } = body;

        if (!withdrawalId) {
            return NextResponse.json(
                { error: 'Withdrawal ID is required' },
                { status: 400 }
            );
        }

        if (!transactionHash) {
            return NextResponse.json(
                { error: 'Transaction hash is required' },
                { status: 400 }
            );
        }

        const result = await completeWithdrawal(
            withdrawalId,
            adminId,
            adminEmail,
            transactionHash,
            { notes, ipAddress }
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Withdrawal completed successfully',
        });

    } catch (error: any) {
        console.error('Complete withdrawal error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to complete withdrawal' },
            { status: 500 }
        );
    }
}

// ============================================================================
// ADMIN: VERIFY TRANSACTION
// ============================================================================

/**
 * POST /api/admin/withdrawals/verify
 * 
 * Body: {
 *   transactionId: string;
 *   txHash: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || '';

        switch (action) {
            case 'approve':
                return approveRequest(request);
            case 'reject':
                return rejectRequest(request);
            case 'complete':
                return completeRequest(request);
            case 'verify':
                // Inline verify logic
                try {
                    const adminId = request.headers.get('x-admin-id') || 'admin';
                    const adminEmail = request.headers.get('x-admin-email') || 'admin@example.com';
                    const body = await request.json();
                    const { transactionId, txHash } = body;
                    if (!transactionId || !txHash) {
                        return NextResponse.json({ error: 'Transaction ID and txHash are required' }, { status: 400 });
                    }
                    await markTransactionVerified(transactionId, adminId, adminEmail, txHash);
                    return NextResponse.json({ success: true, message: 'Transaction verified successfully' });
                } catch (error: any) {
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: approve, reject, complete, verify' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Admin withdrawal action error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process action' },
            { status: 500 }
        );
    }
}

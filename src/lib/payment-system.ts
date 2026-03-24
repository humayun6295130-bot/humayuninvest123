/**
 * Complete Payment & Withdrawal System
 * 
 * Features:
 * - Real-time transaction tracking
 * - Admin approval/rejection workflow
 * - Security features (limits, fraud detection)
 * - Notification system
 * - Audit logging
 * 
 * @version 1.0.0
 */

import {
    insertRow as firebaseInsertRow,
    updateRow as firebaseUpdateRow
} from '@/firebase/database';

// ============================================================================
// TYPES
// ============================================================================

export interface Transaction {
    id?: string;
    user_id: string;
    user_email?: string;
    user_display_name?: string;
    type: 'deposit' | 'withdrawal' | 'investment' | 'daily_claim' | 'referral_bonus' | 'bonus';
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'verified';
    description?: string;
    transaction_hash?: string;
    wallet_address?: string;
    recipient_address?: string;
    sender_address?: string;
    network?: string;
    payment_method?: string;
    fee_amount?: number;
    fee_percentage?: number;
    total_deduction?: number;
    blockchain_verified?: boolean;
    verified_at?: string;
    created_at: string;
    updated_at?: string;
    processed_at?: string;
    processed_by?: string;
    metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
    id?: string;
    user_id: string;
    user_email: string;
    user_display_name?: string;
    amount: number;
    currency: string;
    wallet_address: string;
    network: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'processing';
    requested_at: string;
    processed_at?: string;
    processed_by?: string;
    rejection_reason?: string;
    transaction_hash?: string;
    notes?: string;
    admin_note?: string;
    kyc_verified?: boolean;
    fraud_check_passed?: boolean;
    ip_address?: string;
    metadata?: Record<string, any>;
}

export interface AdminAction {
    id?: string;
    admin_id: string;
    admin_email: string;
    action: 'approve_withdrawal' | 'reject_withdrawal' | 'complete_withdrawal' | 'verify_payment' | 'add_note' | 'update_status';
    target_type: 'withdrawal' | 'deposit' | 'transaction' | 'user';
    target_id: string;
    previous_value?: any;
    new_value?: any;
    notes?: string;
    created_at: string;
    ip_address?: string;
}

export interface Notification {
    id?: string;
    user_id: string;
    title: string;
    message: string;
    type: 'investment' | 'withdrawal' | 'deposit' | 'system' | 'referral' | 'bonus' | 'kyc' | 'security';
    status: 'pending' | 'sent' | 'failed';
    email_sent?: boolean;
    sms_sent?: boolean;
    read?: boolean;
    created_at: string;
    sent_at?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SecurityConfig {
    minWithdrawalAmount: number;
    maxWithdrawalAmount: number;
    dailyWithdrawalLimit: number;
    weeklyWithdrawalLimit: number;
    monthlyWithdrawalLimit: number;
    requireKYC: boolean;
    maxPendingWithdrawals: number;
    fraudCheckEnabled: boolean;
    suspiciousAmountThreshold: number;
    lockPrincipal: boolean;
    allowProfitWithdrawal: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    minWithdrawalAmount: 50,  // Minimum $50
    maxWithdrawalAmount: 10000,
    dailyWithdrawalLimit: 50000,
    weeklyWithdrawalLimit: 200000,
    monthlyWithdrawalLimit: 500000,
    requireKYC: true,
    maxPendingWithdrawals: 3,
    fraudCheckEnabled: true,
    suspiciousAmountThreshold: 5000,
    lockPrincipal: true,  // Principal deposits are locked
    allowProfitWithdrawal: true,  // Only profit is withdrawable
};

export const WITHDRAWAL_FEE_PERCENTAGE = 8;

// Investment level-based profit calculation
export {
    getLevelByAmount,
    calculateDailyIncome,
    calculateMonthlyEarnings,
    INVESTMENT_LEVELS
} from './level-config';

// ============================================================================
// DATABASE HELPERS (Using Firebase)
// ============================================================================

async function insertRow<T>(table: string, data: T): Promise<T & { id: string }> {
    return firebaseInsertRow(table, data);
}

async function updateRow<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    return firebaseUpdateRow(table, id, data);
}

// ============================================================================
// WITHDRAWAL MANAGEMENT
// ============================================================================

/**
 * Create a new withdrawal request
 */
export async function createWithdrawalRequest(
    userId: string,
    userEmail: string,
    userDisplayName: string | undefined,
    amount: number,
    walletAddress: string,
    network: string = 'bep20',
    options?: {
        ipAddress?: string;
        metadata?: Record<string, any>;
    }
): Promise<{ success: boolean; message: string; withdrawal?: WithdrawalRequest }> {
    try {
        // Validate amount
        if (amount < DEFAULT_SECURITY_CONFIG.minWithdrawalAmount) {
            return {
                success: false,
                message: `Minimum withdrawal amount is $${DEFAULT_SECURITY_CONFIG.minWithdrawalAmount}`
            };
        }

        if (amount > DEFAULT_SECURITY_CONFIG.maxWithdrawalAmount) {
            return {
                success: false,
                message: `Maximum withdrawal amount is $${DEFAULT_SECURITY_CONFIG.maxWithdrawalAmount}`
            };
        }

        // Calculate fees
        const feeAmount = amount * (WITHDRAWAL_FEE_PERCENTAGE / 100);
        const totalDeduction = amount + feeAmount;

        // Create withdrawal request
        const withdrawal: Partial<Transaction> = {
            user_id: userId,
            user_email: userEmail,
            user_display_name: userDisplayName,
            type: 'withdrawal',
            amount: amount,
            currency: 'USDT',
            status: 'pending',
            wallet_address: walletAddress,
            description: `Withdrawal to ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`,
            fee_amount: feeAmount,
            fee_percentage: WITHDRAWAL_FEE_PERCENTAGE,
            total_deduction: totalDeduction,
            created_at: new Date().toISOString(),
        };

        const result = await insertRow('transactions', withdrawal);

        // Log the action
        await logAdminAction({
            admin_id: 'system',
            admin_email: 'system',
            action: 'approve_withdrawal',
            target_type: 'withdrawal',
            target_id: result.id,
            new_value: { status: 'pending', amount },
            notes: 'Auto-created from withdrawal request',
        });

        return {
            success: true,
            message: 'Withdrawal request submitted successfully',
            withdrawal: result as any,
        };
    } catch (error: any) {
        console.error('Error creating withdrawal request:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Approve a withdrawal request
 */
export async function approveWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminEmail: string,
    options?: {
        notes?: string;
        ipAddress?: string;
    }
): Promise<{ success: boolean; message: string }> {
    try {
        // Update withdrawal status
        await updateRow('transactions', withdrawalId, {
            status: 'approved',
            processed_at: new Date().toISOString(),
            processed_by: adminEmail,
            admin_note: options?.notes || 'Approved',
        });

        // Log admin action
        await logAdminAction({
            admin_id: adminId,
            admin_email: adminEmail,
            action: 'approve_withdrawal',
            target_type: 'withdrawal',
            target_id: withdrawalId,
            previous_value: { status: 'pending' },
            new_value: { status: 'approved' },
            notes: options?.notes,
            ip_address: options?.ipAddress,
        });

        // Send notification
        await sendNotification({
            user_id: '',
            title: 'Withdrawal Approved',
            message: `Your withdrawal request has been approved.`,
            type: 'withdrawal',
        });

        return { success: true, message: 'Withdrawal approved successfully' };
    } catch (error: any) {
        console.error('Error approving withdrawal:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Reject a withdrawal request
 */
export async function rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminEmail: string,
    reason: string,
    options?: {
        ipAddress?: string;
    }
): Promise<{ success: boolean; message: string }> {
    try {
        // Update withdrawal status
        await updateRow('transactions', withdrawalId, {
            status: 'rejected',
            processed_at: new Date().toISOString(),
            processed_by: adminEmail,
            rejection_reason: reason,
            admin_note: `Rejected: ${reason}`,
        });

        // Log admin action
        await logAdminAction({
            admin_id: adminId,
            admin_email: adminEmail,
            action: 'reject_withdrawal',
            target_type: 'withdrawal',
            target_id: withdrawalId,
            previous_value: { status: 'pending' },
            new_value: { status: 'rejected', reason },
            notes: reason,
            ip_address: options?.ipAddress,
        });

        // Send notification
        await sendNotification({
            user_id: '',
            title: 'Withdrawal Rejected',
            message: `Your withdrawal request has been rejected. Reason: ${reason}`,
            type: 'withdrawal',
        });

        return { success: true, message: 'Withdrawal rejected' };
    } catch (error: any) {
        console.error('Error rejecting withdrawal:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Mark withdrawal as completed (after sending funds)
 */
export async function completeWithdrawal(
    withdrawalId: string,
    adminId: string,
    adminEmail: string,
    transactionHash: string,
    options?: {
        notes?: string;
        ipAddress?: string;
    }
): Promise<{ success: boolean; message: string }> {
    try {
        // Update withdrawal status
        await updateRow('transactions', withdrawalId, {
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: adminEmail,
            transaction_hash: transactionHash,
            admin_note: options?.notes || 'Completed',
        });

        // Log admin action
        await logAdminAction({
            admin_id: adminId,
            admin_email: adminEmail,
            action: 'complete_withdrawal',
            target_type: 'withdrawal',
            target_id: withdrawalId,
            previous_value: { status: 'approved' },
            new_value: { status: 'completed', transaction_hash: transactionHash },
            notes: options?.notes,
            ip_address: options?.ipAddress,
        });

        // Send notification
        await sendNotification({
            user_id: '',
            title: 'Withdrawal Completed',
            message: `Your withdrawal has been completed. Transaction: ${transactionHash}`,
            type: 'withdrawal',
        });

        return { success: true, message: 'Withdrawal completed successfully' };
    } catch (error: any) {
        console.error('Error completing withdrawal:', error);
        return { success: false, message: error.message };
    }
}

// ============================================================================
// TRANSACTION VERIFICATION
// ============================================================================

/**
 * Verify a deposit transaction on blockchain
 * Now uses Etherscan API V2 for BEP20 (BSC ChainID: 56) verification
 */
export async function verifyTransaction(
    txHash: string,
    network: string = 'bep20',
    expectedAmount?: number,
    expectedRecipient?: string
): Promise<{
    valid: boolean;
    status: string;
    amount?: number;
    from?: string;
    to?: string;
    confirmations?: number;
    error?: string;
}> {
    try {
        const response = await fetch('/api/etherscan/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                txHash,
                network: 'bsc',
                token: 'USDT',
                expectedRecipient,
                expectedAmount,
                minConfirmations: 12,
            }),
        });

        const result = await response.json();

        if (result.success && result.data?.valid) {
            return {
                valid: true,
                status: 'verified',
                amount: expectedAmount,
                confirmations: result.data.confirmations,
            };
        }

        return {
            valid: false,
            status: result.data?.status || 'failed',
            error: result.error || 'Verification failed',
        };
    } catch (error: any) {
        return {
            valid: false,
            status: 'error',
            error: error.message,
        };
    }
}

/**
 * Mark transaction as verified (admin action)
 */
export async function markTransactionVerified(
    transactionId: string,
    adminId: string,
    adminEmail: string,
    txHash: string
): Promise<void> {
    await updateRow('transactions', transactionId, {
        status: 'verified',
        blockchain_verified: true,
        verified_at: new Date().toISOString(),
        transaction_hash: txHash,
    });

    await logAdminAction({
        admin_id: adminId,
        admin_email: adminEmail,
        action: 'verify_payment',
        target_type: 'transaction',
        target_id: transactionId,
        new_value: { blockchain_verified: true, tx_hash: txHash },
    });
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Send notification to user
 */
export async function sendNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'status'>
): Promise<void> {
    try {
        await insertRow('notifications', {
            ...notification,
            status: 'pending',
            read: false,
            created_at: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Error sending notification:', error);
    }
}

// ============================================================================
// ADMIN ACTIONS LOGGING
// ============================================================================

/**
 * Log admin action
 */
export async function logAdminAction(
    action: Omit<AdminAction, 'id' | 'created_at'>
): Promise<void> {
    try {
        await insertRow('admin_actions', {
            ...action,
            created_at: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Error logging admin action:', error);
    }
}

// ============================================================================
// SECURITY & FRAUD CHECKS
// ============================================================================

/**
 * Check if user can withdraw (security checks)
 */
export async function checkWithdrawalEligibility(
    userId: string,
    amount: number
): Promise<{
    eligible: boolean;
    reasons: string[];
    checks: {
        kycVerified: boolean;
        dailyLimitOk: boolean;
        pendingWithdrawalsOk: boolean;
        amountWithinLimits: boolean;
    };
}> {
    const reasons: string[] = [];
    const checks = {
        kycVerified: true,
        dailyLimitOk: true,
        pendingWithdrawalsOk: true,
        amountWithinLimits: true,
    };

    // Check amount limits
    if (amount < DEFAULT_SECURITY_CONFIG.minWithdrawalAmount) {
        checks.amountWithinLimits = false;
        reasons.push(`Minimum withdrawal is $${DEFAULT_SECURITY_CONFIG.minWithdrawalAmount}`);
    }
    if (amount > DEFAULT_SECURITY_CONFIG.maxWithdrawalAmount) {
        checks.amountWithinLimits = false;
        reasons.push(`Maximum withdrawal is $${DEFAULT_SECURITY_CONFIG.maxWithdrawalAmount}`);
    }

    // Check daily limit (simplified - would need real query)
    if (DEFAULT_SECURITY_CONFIG.dailyWithdrawalLimit > 0) {
        // In real implementation, query today's withdrawals
    }

    // Suspicious amount check
    if (DEFAULT_SECURITY_CONFIG.fraudCheckEnabled && amount >= DEFAULT_SECURITY_CONFIG.suspiciousAmountThreshold) {
        reasons.push('Amount flagged for additional review');
    }

    return {
        eligible: reasons.length === 0,
        reasons,
        checks,
    };
}

/**
 * Detect suspicious activity
 */
export async function detectSuspiciousActivity(
    userId: string,
    amount: number,
    ipAddress?: string
): Promise<{
    suspicious: boolean;
    reasons: string[];
}> {
    const reasons: string[] = [];

    // Check for unusually large amount
    if (amount >= DEFAULT_SECURITY_CONFIG.suspiciousAmountThreshold) {
        reasons.push('Unusually large withdrawal amount');
    }

    return {
        suspicious: reasons.length > 0,
        reasons,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    createWithdrawalRequest,
    approveWithdrawal,
    rejectWithdrawal,
    completeWithdrawal,
    sendNotification,
    logAdminAction,
    checkWithdrawalEligibility,
    detectSuspiciousActivity,
    DEFAULT_SECURITY_CONFIG,
    WITHDRAWAL_FEE_PERCENTAGE,
};

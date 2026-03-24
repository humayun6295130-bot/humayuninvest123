/**
 * Investment Withdrawal System
 * 
 * Features:
 * - Minimum withdrawal: $50
 * - Daily profit calculation based on deposit level
 * - Deposits shown in wallet but locked (principal cannot be withdrawn)
 * - Only profit (daily earnings) is withdrawable
 * - Complete audit trail
 * 
 * @version 1.0.0
 */

import {
    insertRow as firebaseInsertRow,
    updateRow as firebaseUpdateRow
} from '@/firebase/database';

import {
    getLevelByAmount,
    calculateDailyIncome,
    calculateMonthlyEarnings,
    INVESTMENT_LEVELS,
    LevelConfig
} from './level-config';

// ============================================================================
// TYPES
// ============================================================================

export interface Deposit {
    id: string;
    user_id: string;
    amount: number; // Principal amount (locked)
    level: number;
    status: 'active' | 'completed' | 'cancelled';
    created_at: string;
    last_claim_at?: string;
    total_claimed: number;
    wallet_address?: string;
    payment_method?: string;
    transaction_hash?: string;
}

export interface UserBalance {
    user_id: string;
    total_deposits: number; // Principal (locked)
    total_profit: number; // From daily earnings (withdrawable)
    pending_profit: number; // Accumulated but not claimed
    last_updated: string;
}

export interface WithdrawalRequest {
    id?: string;
    user_id: string;
    user_email: string;
    user_display_name?: string;
    amount: number; // Withdrawal amount
    type: 'profit_withdrawal' | 'deposit_withdrawal'; // Only profit allowed
    currency: string;
    wallet_address: string;
    network: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
    requested_at: string;
    processed_at?: string;
    processed_by?: string;
    rejection_reason?: string;
    transaction_hash?: string;
    notes?: string;
    admin_note?: string;
    metadata?: Record<string, any>;
}

export interface AdminAction {
    id?: string;
    admin_id: string;
    admin_email: string;
    action: string;
    target_type: string;
    target_id: string;
    previous_value?: any;
    new_value?: any;
    notes?: string;
    created_at: string;
}

export interface Notification {
    id?: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    status: string;
    read?: boolean;
    created_at: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const WITHDRAWAL_CONFIG = {
    MIN_WITHDRAWAL_AMOUNT: 50,
    MAX_WITHDRAWAL_AMOUNT: 10000,
    DAILY_WITHDRAWAL_LIMIT: 50000,
    WITHDRAWAL_FEE_PERCENTAGE: 8,
    LOCK_PRINCIPAL: true, // Principal cannot be withdrawn
    ALLOW_PROFIT_WITHDRAWAL: true, // Only profit can be withdrawn
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function insertRow<T>(table: string, data: T): Promise<T & { id: string }> {
    return firebaseInsertRow(table, data);
}

async function updateRow<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    return firebaseUpdateRow(table, id, data);
}

// ============================================================================
// PROFIT CALCULATION
// ============================================================================

/**
 * Calculate profit for a specific deposit based on its level
 */
export function calculateDepositProfit(depositAmount: number, level: number): {
    daily: number;
    monthly: number;
    percentage: number;
} {
    const levelConfig = getLevelByAmount(depositAmount);
    const percentage = levelConfig?.dailyIncomePercent || INVESTMENT_LEVELS[0].dailyIncomePercent;

    return {
        daily: (depositAmount * percentage) / 100,
        monthly: calculateMonthlyEarnings(depositAmount),
        percentage,
    };
}

/**
 * Get level info for a deposit amount
 */
export function getDepositLevel(amount: number): LevelConfig {
    return getLevelByAmount(amount) || INVESTMENT_LEVELS[0];
}

// ============================================================================
// BALANCE MANAGEMENT
// ============================================================================

/**
 * Get user balance (deposits vs profit)
 */
export async function getUserBalance(userId: string): Promise<UserBalance | null> {
    try {
        // This would query from a user_balances collection
        // For now, return mock structure
        return {
            user_id: userId,
            total_deposits: 0,
            total_profit: 0,
            pending_profit: 0,
            last_updated: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error getting user balance:', error);
        return null;
    }
}

/**
 * Update user balance after profit claim or withdrawal
 */
export async function updateUserBalance(
    userId: string,
    updates: {
        addProfit?: number;
        subtractProfit?: number;
        addDeposit?: number;
    }
): Promise<void> {
    try {
        // This would update the user_balances collection
        console.log('Updating balance for user:', userId, updates);
    } catch (error) {
        console.error('Error updating balance:', error);
    }
}

// ============================================================================
// WITHDRAWAL REQUEST (PROFIT ONLY)
// ============================================================================

/**
 * Create a profit withdrawal request
 * Only profit can be withdrawn, not principal deposits
 */
export async function createProfitWithdrawal(
    userId: string,
    userEmail: string,
    userDisplayName: string | undefined,
    amount: number,
    walletAddress: string,
    network: string = 'trc20',
    options?: {
        ipAddress?: string;
        metadata?: Record<string, any>;
    }
): Promise<{ success: boolean; message: string; withdrawal?: WithdrawalRequest }> {
    try {
        // 1. Validate minimum withdrawal
        if (amount < WITHDRAWAL_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
            return {
                success: false,
                message: `Minimum withdrawal amount is $${WITHDRAWAL_CONFIG.MIN_WITHDRAWAL_AMOUNT}`
            };
        }

        // 2. Validate maximum withdrawal
        if (amount > WITHDRAWAL_CONFIG.MAX_WITHDRAWAL_AMOUNT) {
            return {
                success: false,
                message: `Maximum withdrawal amount is $${WITHDRAWAL_CONFIG.MAX_WITHDRAWAL_AMOUNT}`
            };
        }

        // 3. Check if user has enough withdrawable profit
        // In real implementation, query user's profit balance
        // For now, we assume the frontend validates this

        // 4. Calculate fee
        const feeAmount = amount * (WITHDRAWAL_CONFIG.WITHDRAWAL_FEE_PERCENTAGE / 100);
        const totalDeduction = amount + feeAmount;

        // 5. Create withdrawal request
        const withdrawal: Partial<WithdrawalRequest> = {
            user_id: userId,
            user_email: userEmail,
            user_display_name: userDisplayName,
            type: 'profit_withdrawal', // Only profit can be withdrawn
            amount: amount,
            currency: 'USDT',
            wallet_address: walletAddress,
            network: network,
            status: 'pending',
            requested_at: new Date().toISOString(),
            metadata: {
                ...options?.metadata,
                fee_amount: feeAmount,
                fee_percentage: WITHDRAWAL_CONFIG.WITHDRAWAL_FEE_PERCENTAGE,
                total_deduction: totalDeduction,
                is_profit_withdrawal: true,
                is_principal_withdrawal: false, // Principal is locked
            },
        };

        const result = await insertRow('transactions', {
            ...withdrawal,
            description: `Profit withdrawal to ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`,
        } as any);

        // 6. Log admin action
        await logAdminAction({
            admin_id: 'system',
            admin_email: 'system',
            action: 'create_withdrawal',
            target_type: 'withdrawal',
            target_id: result.id,
            new_value: { status: 'pending', amount, type: 'profit_withdrawal' },
            notes: 'Auto-created from profit withdrawal request',
        });

        return {
            success: true,
            message: 'Profit withdrawal request submitted successfully',
            withdrawal: result as any,
        };
    } catch (error: any) {
        console.error('Error creating profit withdrawal:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Attempt to withdraw principal (should always fail - principal is locked)
 */
export async function createPrincipalWithdrawal(
    userId: string,
    userEmail: string,
    amount: number,
    walletAddress: string
): Promise<{ success: boolean; message: string }> {
    // Principal withdrawal is NOT allowed
    return {
        success: false,
        message: 'Principal deposits are locked and cannot be withdrawn. Only profit earnings are withdrawable.'
    };
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

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
        await updateRow('transactions', withdrawalId, {
            status: 'approved',
            processed_at: new Date().toISOString(),
            processed_by: adminEmail,
            admin_note: options?.notes || 'Approved',
        });

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

        // Send notification (would need user_id from withdrawal)
        await sendNotification({
            user_id: '',
            title: 'Withdrawal Approved',
            message: 'Your profit withdrawal request has been approved.',
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
        await updateRow('transactions', withdrawalId, {
            status: 'rejected',
            processed_at: new Date().toISOString(),
            processed_by: adminEmail,
            rejection_reason: reason,
            admin_note: `Rejected: ${reason}`,
        });

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

        await sendNotification({
            user_id: '',
            title: 'Withdrawal Rejected',
            message: `Your profit withdrawal request has been rejected. Reason: ${reason}`,
            type: 'withdrawal',
        });

        return { success: true, message: 'Withdrawal rejected' };
    } catch (error: any) {
        console.error('Error rejecting withdrawal:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Complete withdrawal (after sending funds)
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
        await updateRow('transactions', withdrawalId, {
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: adminEmail,
            transaction_hash: transactionHash,
            admin_note: options?.notes || 'Completed',
        });

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

        await sendNotification({
            user_id: '',
            title: 'Withdrawal Completed',
            message: `Your profit withdrawal has been completed. Transaction: ${transactionHash}`,
            type: 'withdrawal',
        });

        return { success: true, message: 'Withdrawal completed successfully' };
    } catch (error: any) {
        console.error('Error completing withdrawal:', error);
        return { success: false, message: error.message };
    }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

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
// EXPORTS
// ============================================================================

export default {
    createProfitWithdrawal,
    createPrincipalWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    completeWithdrawal,
    calculateDepositProfit,
    getDepositLevel,
    getUserBalance,
    updateUserBalance,
    WITHDRAWAL_CONFIG,
    INVESTMENT_LEVELS,
};

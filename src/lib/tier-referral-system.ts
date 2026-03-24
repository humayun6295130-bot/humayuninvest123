/**
 * Advanced Multi-Tier Referral Engine
 * 
 * Three-Tier Commission Structure:
 * - Level 1 (direct referrer): 10%
 * - Level 2 (upline of Level 1): 5%
 * - Level 3 (upline of Level 2): 2%
 * 
 * @version 2.0.0
 */

import { db } from '@/firebase/config';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    increment,
    Firestore
} from 'firebase/firestore';

// Helper to ensure db is not null
const getDb = (): Firestore => {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    return db;
};

// ============================================================================
// TYPES
// ============================================================================

export interface ReferralHistory {
    id?: string;
    referrer_id: string;
    user_id: string;
    level: 1 | 2 | 3;
    commission_amount: number;
    deposit_amount: number;
    transaction_hash: string;
    created_at: string;
}

export interface ReferralSettings {
    level1_percent: number;
    level2_percent: number;
    level3_percent: number;
    min_withdrawal: number;
    enabled: boolean;
}

// ============================================================================
// COMMISSION RATES (Three-Tier)
// ============================================================================

export const TIER_REFERRAL_COMMISSION = {
    level1: 10,  // 10% for direct referrer
    level2: 5,   // 5% for Level 2 upline
    level3: 2,   // 2% for Level 3 upline
} as const;

export const DEFAULT_TIER_REFERRAL_SETTINGS: ReferralSettings = {
    level1_percent: TIER_REFERRAL_COMMISSION.level1,
    level2_percent: TIER_REFERRAL_COMMISSION.level2,
    level3_percent: TIER_REFERRAL_COMMISSION.level3,
    min_withdrawal: 10,
    enabled: true,
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate referral commissions for a deposit
 * Returns array of commissions to be distributed to uplines
 * 
 * @param depositAmount - The amount of deposit
 * @returns Array of commission objects for each level
 */
export function calculateTierCommissions(depositAmount: number): {
    level: 1 | 2 | 3;
    percent: number;
    amount: number;
}[] {
    const commissions = [];

    // Level 1: 10%
    const level1Amount = depositAmount * (TIER_REFERRAL_COMMISSION.level1 / 100);
    commissions.push({
        level: 1 as 1,
        percent: TIER_REFERRAL_COMMISSION.level1,
        amount: parseFloat(level1Amount.toFixed(2))
    });

    // Level 2: 5%
    const level2Amount = depositAmount * (TIER_REFERRAL_COMMISSION.level2 / 100);
    commissions.push({
        level: 2 as 2,
        percent: TIER_REFERRAL_COMMISSION.level2,
        amount: parseFloat(level2Amount.toFixed(2))
    });

    // Level 3: 2%
    const level3Amount = depositAmount * (TIER_REFERRAL_COMMISSION.level3 / 100);
    commissions.push({
        level: 3 as 3,
        percent: TIER_REFERRAL_COMMISSION.level3,
        amount: parseFloat(level3Amount.toFixed(2))
    });

    return commissions;
}

/**
 * Process tier-based referral commissions after deposit verification
 * This should be called from the deposit verification callback
 * 
 * @param userId - The user who made the deposit
 * @param depositAmount - The amount deposited
 * @param transactionHash - The transaction hash of the deposit
 */
export async function processTierReferralCommissions(
    userId: string,
    depositAmount: number,
    transactionHash: string
): Promise<{
    success: boolean;
    commissions: { level: number; amount: number; referrerId?: string }[];
    message: string;
}> {
    const firestore = getDb();
    const batch = writeBatch(firestore);
    const timestamp = new Date().toISOString();
    const results: { level: number; amount: number; referrerId?: string }[] = [];

    try {
        // Get the user who made the deposit
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (!userDoc.exists()) {
            return { success: false, commissions: [], message: 'User not found' };
        }

        const userData = userDoc.data();

        // Get referrer ID (parent_id)
        const referrerId = userData.parent_id || userData.referrer_id;

        if (!referrerId) {
            // No referrer - skip all commissions
            return {
                success: true,
                commissions: [],
                message: 'No referrer found, commissions skipped'
            };
        }

        // Calculate commissions
        const commissions = calculateTierCommissions(depositAmount);

        // Get referrer (Level 1)
        const referrerDoc = await getDoc(doc(firestore, 'users', referrerId));

        if (referrerDoc.exists()) {
            const referrerData = referrerDoc.data();
            const level1Commission = commissions[0];

            // Credit Level 1 referrer
            if (level1Commission.amount > 0) {
                batch.update(doc(firestore, 'users', referrerId), {
                    referral_balance: increment(level1Commission.amount),
                    referral_earnings: increment(level1Commission.amount),
                    updated_at: timestamp,
                });

                // Create referral history record
                const historyRef = doc(collection(firestore, 'referral_history'));
                batch.set(historyRef, {
                    referrer_id: referrerId,
                    user_id: userId,
                    level: 1,
                    commission_amount: level1Commission.amount,
                    deposit_amount: depositAmount,
                    transaction_hash: transactionHash,
                    created_at: timestamp,
                } as ReferralHistory);

                results.push({
                    level: 1,
                    amount: level1Commission.amount,
                    referrerId
                });
            }

            // Get Level 2 referrer (upline of Level 1)
            const level2ReferrerId = referrerData.parent_id || referrerData.referral_id;

            if (level2ReferrerId) {
                const level2Doc = await getDoc(doc(firestore, 'users', level2ReferrerId));

                if (level2Doc.exists()) {
                    const level2Commission = commissions[1];

                    // Credit Level 2 referrer
                    if (level2Commission.amount > 0) {
                        batch.update(doc(firestore, 'users', level2ReferrerId), {
                            referral_balance: increment(level2Commission.amount),
                            referral_earnings: increment(level2Commission.amount),
                            updated_at: timestamp,
                        });

                        // Create referral history record
                        const historyRef = doc(collection(firestore, 'referral_history'));
                        batch.set(historyRef, {
                            referrer_id: level2ReferrerId,
                            user_id: userId,
                            level: 2,
                            commission_amount: level2Commission.amount,
                            deposit_amount: depositAmount,
                            transaction_hash: transactionHash,
                            created_at: timestamp,
                        } as ReferralHistory);

                        results.push({
                            level: 2,
                            amount: level2Commission.amount,
                            referrerId: level2ReferrerId
                        });
                    }

                    // Get Level 3 referrer (upline of Level 2)
                    const level2Data = level2Doc.data();
                    const level3ReferrerId = level2Data.parent_id || level2Data.referrer_id;

                    if (level3ReferrerId) {
                        const level3Doc = await getDoc(doc(firestore, 'users', level3ReferrerId));

                        if (level3Doc.exists()) {
                            const level3Commission = commissions[2];

                            // Credit Level 3 referrer
                            if (level3Commission.amount > 0) {
                                batch.update(doc(firestore, 'users', level3ReferrerId), {
                                    referral_balance: increment(level3Commission.amount),
                                    referral_earnings: increment(level3Commission.amount),
                                    updated_at: timestamp,
                                });

                                // Create referral history record
                                const historyRef = doc(collection(firestore, 'referral_history'));
                                batch.set(historyRef, {
                                    referrer_id: level3ReferrerId,
                                    user_id: userId,
                                    level: 3,
                                    commission_amount: level3Commission.amount,
                                    deposit_amount: depositAmount,
                                    transaction_hash: transactionHash,
                                    created_at: timestamp,
                                } as ReferralHistory);

                                results.push({
                                    level: 3,
                                    amount: level3Commission.amount,
                                    referrerId: level3ReferrerId
                                });
                            }
                        }
                    }
                }
            }
        }

        // Commit all changes
        await batch.commit();

        return {
            success: true,
            commissions: results,
            message: `Processed ${results.length} tier commissions`
        };

    } catch (error: any) {
        console.error('Error processing tier referral commissions:', error);
        return {
            success: false,
            commissions: results,
            message: error.message
        };
    }
}

/**
 * Get referral history for a user (as referrer)
 */
export async function getReferralHistory(
    referrerId: string,
    options?: {
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }
): Promise<ReferralHistory[]> {
    const firestore = getDb();

    try {
        let q = query(
            collection(firestore, 'referral_history'),
            where('referrer_id', '==', referrerId),
            orderBy('created_at', 'desc')
        );

        if (options?.limit) {
            q = query(q, limit(options.limit));
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ReferralHistory));

    } catch (error) {
        console.error('Error getting referral history:', error);
        return [];
    }
}

/**
 * Get total commissions earned by a referrer
 */
export async function getTotalReferralEarnings(referrerId: string): Promise<number> {
    const firestore = getDb();

    try {
        const q = query(
            collection(firestore, 'referral_history'),
            where('referrer_id', '==', referrerId)
        );

        const snapshot = await getDocs(q);

        let total = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            total += data.commission_amount || 0;
        });

        return total;

    } catch (error) {
        console.error('Error getting total referral earnings:', error);
        return 0;
    }
}

/**
 * Set parent/referrer for a user
 */
export async function setUserParent(
    userId: string,
    parentId: string
): Promise<{ success: boolean; message: string }> {
    const firestore = getDb();

    try {
        await updateDoc(doc(firestore, 'users', userId), {
            parent_id: parentId,
            updated_at: new Date().toISOString(),
        });

        return { success: true, message: 'Parent set successfully' };
    } catch (error: any) {
        console.error('Error setting parent:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Get user's referrer chain (all uplines)
 */
export async function getReferrerChain(
    userId: string
): Promise<{
    level1?: string;
    level2?: string;
    level3?: string;
}> {
    const firestore = getDb();
    const chain: { level1?: string; level2?: string; level3?: string } = {};

    try {
        // Get Level 1
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (!userDoc.exists()) return chain;

        const userData = userDoc.data();
        chain.level1 = userData.parent_id || userData.referrer_id;

        if (!chain.level1) return chain;

        // Get Level 2
        const level1Doc = await getDoc(doc(firestore, 'users', chain.level1));
        if (level1Doc.exists()) {
            const level1Data = level1Doc.data();
            chain.level2 = level1Data.parent_id || level1Data.referrer_id;
        }

        if (!chain.level2) return chain;

        // Get Level 3
        const level2Doc = await getDoc(doc(firestore, 'users', chain.level2));
        if (level2Doc.exists()) {
            const level2Data = level2Doc.data();
            chain.level3 = level2Data.parent_id || level2Data.referrer_id;
        }

        return chain;

    } catch (error) {
        console.error('Error getting referrer chain:', error);
        return chain;
    }
}

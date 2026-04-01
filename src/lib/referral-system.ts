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
    Firestore,
} from 'firebase/firestore';
import { REFERRAL_COMMISSION_MAX_DEPTH } from '@/lib/deposit-income-tiers';

// Helper to ensure db is not null
const getDb = (): Firestore => {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    return db;
};

// ─── Types ─────────────────────────────────────────────────

export interface ReferralLevel {
    level: number;
    name: string;
    commissionPercent: number;
    minTeamSize: number;
    minTeamInvestment: number;
}

export interface ReferralSettings {
    level1_percent: number;
    level2_percent: number;
    level3_percent: number;
    level4_percent?: number;
    level5_percent?: number;
    min_withdrawal: number;
    enabled: boolean;
}

export interface UserReferral {
    id: string;
    referrer_id: string;
    referred_user_id: string;
    referred_email: string;
    referred_username: string;
    /** Display name at signup (not an email substitute for username in UI). */
    referred_name?: string;
    level: number;
    commission_percent: number;
    total_commission: number;
    status: 'active' | 'inactive';
    created_at: string;
    investment_amount: number;
}

export interface ReferralBonus {
    id: string;
    user_id: string;
    user_email: string;
    from_user_id: string;
    from_username: string;
    amount: number;
    type: 'investment' | 'daily' | 'withdrawal' | 'bonus';
    level: number;
    level_percent: number;
    description: string;
    status: 'pending' | 'approved' | 'paid';
    created_at: string;
    paid_at?: string;
}

export interface UserTeam {
    user_id: string;
    total_members: number;
    level1_count: number;
    level2_count: number;
    level3_count: number;
    level4_count?: number;
    level5_count?: number;
    total_team_investment: number;
    total_commission_earned: number;
    current_level: number;
    updated_at: string;
}

// ─── Default Commission Levels ─────────────────────────────

export const DEFAULT_REFERRAL_LEVELS: ReferralLevel[] = [
    { level: 1, name: 'Starter', commissionPercent: 1, minTeamSize: 0, minTeamInvestment: 0 },
    { level: 2, name: 'Bronze', commissionPercent: 2, minTeamSize: 3, minTeamInvestment: 100 },
    { level: 3, name: 'Silver', commissionPercent: 3, minTeamSize: 10, minTeamInvestment: 500 },
    { level: 4, name: 'Gold', commissionPercent: 4, minTeamSize: 25, minTeamInvestment: 2000 },
    { level: 5, name: 'Platinum', commissionPercent: 5, minTeamSize: 50, minTeamInvestment: 5000 },
];

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
    level1_percent: 5,
    level2_percent: 3,
    level3_percent: 2,
    min_withdrawal: 10,
    enabled: true,
};

// ─── Core Functions ─────────────────────────────────────

/**
 * Get referral settings from database
 */
export async function getReferralSettings(): Promise<ReferralSettings> {
    try {
        const firestore = getDb();
        const settingsDoc = await getDoc(doc(firestore, 'referral_settings', 'default'));
        if (settingsDoc.exists()) {
            return settingsDoc.data() as ReferralSettings;
        }
        // Create default settings if not exists
        await setDoc(doc(firestore, 'referral_settings', 'default'), DEFAULT_REFERRAL_SETTINGS);
        return DEFAULT_REFERRAL_SETTINGS;
    } catch (error) {
        console.error('Error getting referral settings:', error);
        return DEFAULT_REFERRAL_SETTINGS;
    }
}

/**
 * Update referral settings
 */
export async function updateReferralSettings(settings: Partial<ReferralSettings>): Promise<void> {
    const firestore = getDb();
    await updateDoc(doc(firestore, 'referral_settings', 'default'), {
        ...settings,
        updated_at: new Date().toISOString(),
    });
}

/**
 * Create a referral link for a user
 */
export async function createReferralLink(userId: string, username: string): Promise<string> {
    const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set. Please configure your platform base URL.');
    }
    return `${baseUrl}/register?ref=${username}`;
}

/**
 * Process a new referral when a user registers
 */
export async function processNewReferral(
    referrerId: string,
    referredUserId: string,
    referredEmail: string,
    referredUsername: string,
    investmentAmount: number = 0,
    referredDisplayName?: string
): Promise<void> {
    const referredName =
        referredDisplayName?.trim() ||
        referredUsername?.trim() ||
        "";
    const firestore = getDb();
    const batch = writeBatch(firestore);
    const timestamp = new Date().toISOString();

    // Get referrer's current level and commission rate
    const referrerDoc = await getDoc(doc(firestore, 'users', referrerId));
    if (!referrerDoc.exists()) {
        throw new Error('Referrer not found');
    }

    const referrerData = referrerDoc.data();

    // Check if team commission is enabled for referrer
    const teamCommissionEnabled = referrerData.team_commission_enabled !== false;

    const referrerLevel = referrerData.referral_level || 1;

    // Get commission percentage based on referrer's level
    const levels = DEFAULT_REFERRAL_LEVELS;
    const levelConfig = levels.find(l => l.level === referrerLevel) || levels[0];
    const commissionPercent = levelConfig.commissionPercent;

    // 1. Create referral record (always create - tracks the relationship)
    const referralRef = doc(collection(firestore, 'referrals'));
    batch.set(referralRef, {
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        referred_email: referredEmail,
        referred_username: referredUsername,
        referred_name: referredName,
        level: 1,
        commission_percent: commissionPercent,
        total_commission: 0,
        status: teamCommissionEnabled ? 'active' : 'inactive',
        investment_amount: investmentAmount,
        created_at: timestamp,
    });

    // 2. Update referrer's team count
    const teamRef = doc(firestore, 'user_teams', referrerId);
    const teamDoc = await getDoc(teamRef);

    if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const level1Count = (teamData.level1_count || 0) + 1;
        const totalMembers = (teamData.total_members || 0) + 1;
        const totalInvestment = (teamData.total_team_investment || 0) + investmentAmount;

        // Calculate new level based on team size and investment
        const newLevel = calculateTeamLevel(totalMembers, totalInvestment);

        batch.update(teamRef, {
            level1_count: level1Count,
            total_members: totalMembers,
            total_team_investment: totalInvestment,
            current_level: newLevel,
            updated_at: timestamp,
        });
    } else {
        batch.set(teamRef, {
            user_id: referrerId,
            total_members: 1,
            level1_count: 1,
            level2_count: 0,
            level3_count: 0,
            level4_count: 0,
            level5_count: 0,
            total_team_investment: investmentAmount,
            total_commission_earned: 0,
            current_level: 1,
            updated_at: timestamp,
        });
    }

    // 3. If there's an upstream referrer, create level-2 row (grandparent sees new member C in gen 2)
    const grandparentId = referrerData.referrer_id as string | undefined;
    if (grandparentId) {
        const level2Config = levels.find(l => l.level === 2) || levels[1];
        const level2Ref = doc(collection(firestore, 'referrals'));
        batch.set(level2Ref, {
            referrer_id: grandparentId,
            referred_user_id: referredUserId,
            referred_email: referredEmail,
            referred_username: referredUsername,
            referred_name: referredName,
            /** Immediate referrer (direct parent) — same as level-1 referrer for this signup */
            parent_referrer_id: referrerId,
            level: 2,
            commission_percent: level2Config.commissionPercent,
            total_commission: 0,
            status: 'active',
            investment_amount: investmentAmount,
            created_at: timestamp,
        });

        const level2TeamRef = doc(firestore, 'user_teams', grandparentId);
        batch.set(
            level2TeamRef,
            {
                user_id: grandparentId,
                level2_count: increment(1),
                total_members: increment(1),
                updated_at: timestamp,
            },
            { merge: true }
        );

        const grandparentDoc = await getDoc(doc(firestore, 'users', grandparentId));
        const greatGrandparentId = grandparentDoc.exists()
            ? (grandparentDoc.data().referrer_id as string | undefined)
            : undefined;

        if (greatGrandparentId) {
            const level3Config = levels.find(l => l.level === 3) || levels[2];
            const level3Ref = doc(collection(firestore, 'referrals'));
            batch.set(level3Ref, {
                referrer_id: greatGrandparentId,
                referred_user_id: referredUserId,
                referred_email: referredEmail,
                referred_username: referredUsername,
                referred_name: referredName,
                parent_referrer_id: referrerId,
                intermediate_referrer_id: grandparentId,
                level: 3,
                commission_percent: level3Config.commissionPercent,
                total_commission: 0,
                status: 'active',
                investment_amount: investmentAmount,
                created_at: timestamp,
            });

            const level3TeamRef = doc(firestore, 'user_teams', greatGrandparentId);
            batch.set(
                level3TeamRef,
                {
                    user_id: greatGrandparentId,
                    level3_count: increment(1),
                    total_members: increment(1),
                    updated_at: timestamp,
                },
                { merge: true }
            );
        }
    }

    await batch.commit();

    // 4. Initial signup commission only after referral graph is committed (investment > 0 is rare on register)
    if (investmentAmount > 0 && teamCommissionEnabled) {
        const commission = investmentAmount * (commissionPercent / 100);
        await awardCommission(
            firestore,
            referrerId,
            referredUserId,
            referredUsername,
            commission,
            'investment',
            investmentAmount
        );
    } else if (investmentAmount > 0 && !teamCommissionEnabled) {
        console.log(`Skipping initial commission for referrer ${referrerId}: Team commission disabled`);
    }
}

/**
 * Calculate team level based on members and investment
 */
export function calculateTeamLevel(totalMembers: number, totalInvestment: number): number {
    for (let i = DEFAULT_REFERRAL_LEVELS.length - 1; i >= 0; i--) {
        const level = DEFAULT_REFERRAL_LEVELS[i];
        if (totalMembers >= level.minTeamSize && totalInvestment >= level.minTeamInvestment) {
            return level.level;
        }
    }
    return 1;
}

/**
 * Award commission to a referrer
 */
export async function awardCommission(
    firestore: Firestore,
    userId: string,
    fromUserId: string,
    fromUsername: string,
    amount: number,
    type: 'investment' | 'daily' | 'withdrawal' | 'bonus',
    investmentAmount: number = 0,
    mlmMeta?: { uplineDepth: number; percentApplied: number }
): Promise<void> {
    const batch = writeBatch(firestore);
    const timestamp = new Date().toISOString();

    // Get user's referral level
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();

    // Check if team commission is enabled for this user
    const teamCommissionEnabled = userData.team_commission_enabled !== false;
    if (!teamCommissionEnabled) {
        console.log(`Skipping commission for user ${userId}: Team commission disabled`);
        return;
    }

    const userLevel = userData.referral_level || 1;
    const levelConfig = DEFAULT_REFERRAL_LEVELS.find(l => l.level === userLevel) || DEFAULT_REFERRAL_LEVELS[0];

    const bonusLevel = mlmMeta?.uplineDepth ?? userLevel;
    const bonusPercent = mlmMeta?.percentApplied ?? levelConfig.commissionPercent;
    const description = mlmMeta
        ? `Investment bonus — upline level ${mlmMeta.uplineDepth} (${mlmMeta.percentApplied}% of deposit) from ${fromUsername}`
        : `${type === 'investment' ? 'Investment' : type === 'daily' ? 'Daily' : type === 'withdrawal' ? 'Withdrawal' : 'Bonus'} commission from ${fromUsername} (referral tier ${userLevel})`;

    // 1. Create bonus record
    const bonusRef = doc(collection(firestore, 'referral_bonuses'));
    batch.set(bonusRef, {
        user_id: userId,
        user_email: userData.email,
        from_user_id: fromUserId,
        from_username: fromUsername,
        amount: amount,
        type: type,
        level: bonusLevel,
        level_percent: bonusPercent,
        description,
        status: 'approved',
        created_at: timestamp,
        paid_at: timestamp,
    });

    // 2. Referrer team stats — use set+merge so missing user_teams docs do not fail the whole batch
    const teamRef = doc(firestore, 'user_teams', userId);
    batch.set(
        teamRef,
        {
            user_id: userId,
            total_commission_earned: increment(amount),
            updated_at: timestamp,
        },
        { merge: true }
    );

    // 3. Add to user's referral_balance (available to withdraw) and referral_earnings (all-time total)
    const userRef = doc(firestore, 'users', userId);
    batch.update(userRef, {
        referral_earnings: increment(amount),
        referral_balance: increment(amount),
        updated_at: timestamp,
    });

    await batch.commit();
}

/**
 * When a deposit/investment is confirmed (client Firestore), pay up to 3 uplines
 * using `referral_settings` percentages. Single entry point so every activation path stays consistent.
 */
export async function distributeInvestmentReferralCommissions(
    firestore: Firestore,
    investorUserId: string,
    investmentAmount: number,
    investorDisplayName: string
): Promise<void> {
    if (investmentAmount <= 0) return;

    const settings = await getReferralSettings();
    if (!settings.enabled) {
        return;
    }

    const commissionPercents = [
        settings.level1_percent,
        settings.level2_percent,
        settings.level3_percent,
    ];

    const userDoc = await getDoc(doc(firestore, 'users', investorUserId));
    if (!userDoc.exists()) return;

    let currentReferrerId = userDoc.data().referrer_id as string | undefined;
    if (!currentReferrerId || typeof currentReferrerId !== 'string') return;
    currentReferrerId = currentReferrerId.trim();
    if (!currentReferrerId) return;

    let level = 0;
    while (currentReferrerId && level < REFERRAL_COMMISSION_MAX_DEPTH) {
        const percent = Number(commissionPercents[level] ?? 0);
        const referrerDoc = await getDoc(doc(firestore, 'users', currentReferrerId));
        if (!referrerDoc.exists()) break;

        if (percent > 0) {
            const commission = investmentAmount * (percent / 100);
            if (commission > 0) {
                await awardCommission(
                    firestore,
                    currentReferrerId,
                    investorUserId,
                    investorDisplayName,
                    commission,
                    'investment',
                    investmentAmount,
                    { uplineDepth: level + 1, percentApplied: percent }
                );
            }
        }

        const nextRaw = referrerDoc.data().referrer_id as string | undefined;
        const next =
            nextRaw && typeof nextRaw === 'string' && nextRaw.trim().length > 0 ? nextRaw.trim() : undefined;
        currentReferrerId = next;
        level++;
    }
}

/**
 * Process daily commissions for all active referrals
 * This should be called by a scheduled job (cron)
 */
export async function processDailyCommissions(): Promise<{
    processed: number;
    totalCommission: number;
    errors: string[];
}> {
    const results = {
        processed: 0,
        totalCommission: 0,
        errors: [] as string[]
    };

    try {
        const firestore = getDb();

        // Get all active referrals with investments
        const referralsQuery = query(
            collection(firestore, 'referrals'),
            where('status', '==', 'active'),
            where('investment_amount', '>', 0)
        );

        const referralsSnapshot = await getDocs(referralsQuery);

        for (const referralDoc of referralsSnapshot.docs) {
            const referral = referralDoc.data();

            try {
                // Calculate daily commission (e.g., 0.5% of referred user's daily profit)
                const dailyProfit = referral.daily_profit || 0;
                if (dailyProfit > 0) {
                    const commission = dailyProfit * (referral.commission_percent / 100);

                    if (commission > 0) {
                        await awardCommission(
                            firestore,
                            referral.referrer_id,
                            referral.referred_user_id,
                            referral.referred_username,
                            commission,
                            'daily',
                            referral.investment_amount
                        );

                        results.processed++;
                        results.totalCommission += commission;
                    }
                }
            } catch (error: any) {
                results.errors.push(`Error processing referral ${referralDoc.id}: ${error.message}`);
            }
        }
    } catch (error: any) {
        results.errors.push(`Fatal error: ${error.message}`);
    }

    return results;
}

/**
 * Get user's referral statistics
 */
export async function getUserReferralStats(userId: string): Promise<{
    totalReferrals: number;
    level1Count: number;
    level2Count: number;
    level3Count: number;
    totalTeamInvestment: number;
    totalCommissionEarned: number;
    currentLevel: number;
    levelName: string;
    nextLevel: ReferralLevel | null;
    progressToNextLevel: number;
}> {
    const firestore = getDb();
    const teamDoc = await getDoc(doc(firestore, 'user_teams', userId));

    if (!teamDoc.exists()) {
        return {
            totalReferrals: 0,
            level1Count: 0,
            level2Count: 0,
            level3Count: 0,
            totalTeamInvestment: 0,
            totalCommissionEarned: 0,
            currentLevel: 1,
            levelName: 'Starter',
            nextLevel: DEFAULT_REFERRAL_LEVELS[1],
            progressToNextLevel: 0
        };
    }

    const teamData = teamDoc.data();
    const currentLevel = teamData.current_level || 1;
    const levelConfig = DEFAULT_REFERRAL_LEVELS.find(l => l.level === currentLevel) || DEFAULT_REFERRAL_LEVELS[0];
    const nextLevelConfig = DEFAULT_REFERRAL_LEVELS.find(l => l.level === currentLevel + 1) || null;

    // Calculate progress to next level
    let progressToNextLevel = 0;
    if (nextLevelConfig && nextLevelConfig.minTeamSize > 0) {
        const currentSize = teamData.total_members || 0;
        const nextSize = nextLevelConfig.minTeamSize;
        progressToNextLevel = Math.min(100, (currentSize / nextSize) * 100);
    }

    return {
        totalReferrals: teamData.total_members || 0,
        level1Count: teamData.level1_count || 0,
        level2Count: teamData.level2_count || 0,
        level3Count: teamData.level3_count || 0,
        totalTeamInvestment: teamData.total_team_investment || 0,
        totalCommissionEarned: teamData.total_commission_earned || 0,
        currentLevel,
        levelName: levelConfig.name,
        nextLevel: nextLevelConfig,
        progressToNextLevel
    };
}

/**
 * Get user's referral history/earnings
 */
export async function getUserReferralEarnings(
    userId: string,
    limitCount: number = 20
): Promise<ReferralBonus[]> {
    const firestore = getDb();
    const earningsQuery = query(
        collection(firestore, 'referral_bonuses'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(earningsQuery);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as ReferralBonus[];
}

/**
 * Get all direct referrals of a user
 */
export async function getUserDirectReferrals(userId: string): Promise<UserReferral[]> {
    const firestore = getDb();
    const referralsQuery = query(
        collection(firestore, 'referrals'),
        where('referrer_id', '==', userId),
        where('level', '==', 1),
        orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(referralsQuery);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as UserReferral[];
}

/**
 * Validate referral code/username
 */
export async function validateReferralCode(code: string): Promise<{
    valid: boolean;
    userId?: string;
    username?: string;
    displayName?: string;
    message: string;
}> {
    try {
        // Input validation
        if (!code || typeof code !== 'string' || code.length < 3 || code.length > 50) {
            return { valid: false, message: 'Invalid referral code format' };
        }

        const firestore = getDb();

        // First: search by referral_code (exact match, case-insensitive via uppercase)
        const byCodeQuery = query(
            collection(firestore, 'users'),
            where('referral_code', '==', code.toUpperCase()),
            limit(1)
        );
        const byCodeSnapshot = await getDocs(byCodeQuery);

        if (!byCodeSnapshot.empty) {
            const userDoc = byCodeSnapshot.docs[0];
            const d = userDoc.data();
            return {
                valid: true,
                userId: userDoc.id,
                username: d.username,
                displayName: d.display_name,
                message: 'Valid referral code'
            };
        }

        // Fallback: search by username (legacy support)
        const byUsernameQuery = query(
            collection(firestore, 'users'),
            where('username', '==', code.toLowerCase()),
            limit(1)
        );
        const byUsernameSnapshot = await getDocs(byUsernameQuery);

        if (byUsernameSnapshot.empty) {
            return { valid: false, message: 'Invalid referral code' };
        }

        const userDoc = byUsernameSnapshot.docs[0];
        const d = userDoc.data();
        return {
            valid: true,
            userId: userDoc.id,
            username: d.username,
            displayName: d.display_name,
            message: 'Valid referral code'
        };
    } catch (error) {
        return { valid: false, message: 'Error validating referral code' };
    }
}

/**
 * Request referral earnings withdrawal
 */
export async function requestReferralWithdrawal(
    userId: string,
    amount: number
): Promise<{ success: boolean; message: string }> {
    try {
        const firestore = getDb();
        // Get user balance
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (!userDoc.exists()) {
            return { success: false, message: 'User not found' };
        }

        const userData = userDoc.data();
        const availableBalance = userData.referral_earnings || 0;

        // Get minimum withdrawal
        const settings = await getReferralSettings();

        if (amount < settings.min_withdrawal) {
            return { success: false, message: `Minimum withdrawal is $${settings.min_withdrawal}` };
        }

        if (amount > availableBalance) {
            return { success: false, message: 'Insufficient balance' };
        }

        // Create withdrawal request
        await addDoc(collection(firestore, 'referral_withdrawals'), {
            user_id: userId,
            user_email: userData.email,
            amount: amount,
            status: 'pending',
            requested_at: new Date().toISOString(),
            processed_at: null,
            processed_by: null,
            created_at: new Date().toISOString(),
        });

        return { success: true, message: 'Withdrawal request submitted successfully' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

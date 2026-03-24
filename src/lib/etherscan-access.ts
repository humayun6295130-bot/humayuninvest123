/**
 * Plan-Based Access Control System
 * 
 * Provides access control for different plan tiers (Free, Basic, Pro, Enterprise)
 * with rate limiting, feature flags, and API usage tracking.
 * 
 * @version 1.0.0
 * @author Investment Platform Team
 */

import {
    PlanTier,
    PlanLimits,
    PLAN_LIMITS,
    BlockchainNetwork,
    NETWORK_CONFIGS,
} from './etherscan';

// ============================================================================
// TYPES
// ============================================================================

export interface UserPlan {
    tier: PlanTier;
    name: string;
    monthlyApiCalls: number;
    usedApiCalls: number;
    remainingApiCalls: number;
    wallets: string[];
    maxWallets: number;
    features: string[];
    expiresAt: Date;
    createdAt: Date;
}

export interface AccessControlResult {
    allowed: boolean;
    reason?: string;
    remaining?: number;
    limit?: number;
}

export interface UsageMetrics {
    userId: string;
    plan: PlanTier;
    apiCallsUsed: number;
    apiCallsLimit: number;
    transactionsVerified: number;
    walletsAdded: number;
    webhooksConfigured: number;
    periodStart: Date;
    periodEnd: Date;
}

// ============================================================================
// USAGE TRACKER
// ============================================================================

class UsageTracker {
    private usage: Map<string, UsageMetrics> = new Map();
    private callCount: Map<string, number> = new Map();

    /**
     * Record an API call
     */
    recordCall(userId: string, plan: PlanTier): boolean {
        const key = `${userId}_${new Date().getMonth()}`;
        const current = this.callCount.get(key) || 0;
        const limit = PLAN_LIMITS[plan].monthlyApiCalls;

        // Check if limit is unlimited (-1)
        if (limit === -1) {
            this.callCount.set(key, current + 1);
            return true;
        }

        if (current >= limit) {
            return false;
        }

        this.callCount.set(key, current + 1);
        return true;
    }

    /**
     * Get remaining API calls
     */
    getRemainingCalls(userId: string, plan: PlanTier): number {
        const key = `${userId}_${new Date().getMonth()}`;
        const used = this.callCount.get(key) || 0;
        const limit = PLAN_LIMITS[plan].monthlyApiCalls;

        if (limit === -1) {
            return -1; // Unlimited
        }

        return Math.max(0, limit - used);
    }

    /**
     * Get usage metrics for a user
     */
    getMetrics(userId: string, plan: PlanTier): UsageMetrics {
        const key = `${userId}_${new Date().getMonth()}`;
        const used = this.callCount.get(key) || 0;

        return {
            userId,
            plan,
            apiCallsUsed: used,
            apiCallsLimit: PLAN_LIMITS[plan].monthlyApiCalls,
            transactionsVerified: used, // Simplified
            walletsAdded: 0,
            webhooksConfigured: 0,
            periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        };
    }

    /**
     * Reset usage for a user
     */
    resetUsage(userId: string): void {
        const key = `${userId}_${new Date().getMonth()}`;
        this.callCount.delete(key);
    }

    /**
     * Get total calls this period
     */
    getTotalCalls(userId: string): number {
        const key = `${userId}_${new Date().getMonth()}`;
        return this.callCount.get(key) || 0;
    }
}

// ============================================================================
// ACCESS CONTROLLER
// ============================================================================

export class AccessController {
    private userPlans: Map<string, UserPlan> = new Map();
    private usageTracker: UsageTracker;
    private defaultPlan: PlanTier = 'free';

    constructor() {
        this.usageTracker = new UsageTracker();
    }

    // ========================================================================
    // PLAN MANAGEMENT
    // ========================================================================

    /**
     * Set user plan
     */
    setUserPlan(userId: string, tier: PlanTier, expiresAt?: Date): void {
        const limits = PLAN_LIMITS[tier];

        this.userPlans.set(userId, {
            tier,
            name: limits.name,
            monthlyApiCalls: limits.monthlyApiCalls,
            usedApiCalls: 0,
            remainingApiCalls: limits.monthlyApiCalls === -1 ? -1 : limits.monthlyApiCalls,
            wallets: [],
            maxWallets: limits.maxWallets,
            features: limits.features,
            expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
        });
    }

    /**
     * Get user plan
     */
    getUserPlan(userId: string): UserPlan | null {
        return this.userPlans.get(userId) || null;
    }

    /**
     * Get user plan tier
     */
    getUserTier(userId: string): PlanTier {
        const plan = this.userPlans.get(userId);
        return plan?.tier || this.defaultPlan;
    }

    /**
     * Check if plan is expired
     */
    isPlanExpired(userId: string): boolean {
        const plan = this.userPlans.get(userId);
        if (!plan) return true;
        return plan.expiresAt < new Date();
    }

    // ========================================================================
    // ACCESS CHECKS
    // ========================================================================

    /**
     * Check if user can access a feature
     */
    canAccessFeature(userId: string, feature: string): AccessControlResult {
        const plan = this.userPlans.get(userId);

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        if (this.isPlanExpired(userId)) {
            return {
                allowed: false,
                reason: 'Plan expired',
            };
        }

        const hasFeature = plan.features.includes(feature);

        return {
            allowed: hasFeature,
            reason: hasFeature ? undefined : `Feature '${feature}' not available on ${plan.name} plan`,
        };
    }

    /**
     * Check if user can make API call
     */
    canMakeApiCall(userId: string): AccessControlResult {
        const plan = this.userPlans.get(userId);
        const tier = plan?.tier || this.defaultPlan;
        const limits = PLAN_LIMITS[tier];

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        if (this.isPlanExpired(userId)) {
            return {
                allowed: false,
                reason: 'Plan expired',
            };
        }

        // Check rate limit
        const remaining = this.usageTracker.getRemainingCalls(userId, tier);

        if (remaining === 0) {
            return {
                allowed: false,
                reason: `Monthly API limit (${limits.monthlyApiCalls}) reached`,
                remaining: 0,
                limit: limits.monthlyApiCalls,
            };
        }

        // Record the call
        const recorded = this.usageTracker.recordCall(userId, tier);

        if (!recorded) {
            return {
                allowed: false,
                reason: 'Rate limit exceeded',
                remaining: 0,
                limit: limits.monthlyApiCalls,
            };
        }

        return {
            allowed: true,
            remaining: remaining === -1 ? -1 : remaining - 1,
            limit: limits.monthlyApiCalls,
        };
    }

    /**
     * Check if user can add more wallets
     */
    canAddWallet(userId: string): AccessControlResult {
        const plan = this.userPlans.get(userId);

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        if (plan.maxWallets === -1) {
            return {
                allowed: true,
                reason: 'Unlimited wallets',
            };
        }

        const canAdd = plan.wallets.length < plan.maxWallets;

        return {
            allowed: canAdd,
            reason: canAdd ? undefined : `Maximum wallets (${plan.maxWallets}) reached`,
            remaining: plan.maxWallets - plan.wallets.length,
            limit: plan.maxWallets,
        };
    }

    /**
     * Check if user can use webhook
     */
    canUseWebhook(userId: string): AccessControlResult {
        const plan = this.userPlans.get(userId);

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        const limits = PLAN_LIMITS[plan.tier];

        return {
            allowed: limits.webhookSupport,
            reason: limits.webhookSupport ? undefined : 'Webhooks not available on Free/Basic plans',
        };
    }

    /**
     * Check if user can use real-time notifications
     */
    canUseRealTimeNotifications(userId: string): AccessControlResult {
        const plan = this.userPlans.get(userId);

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        const limits = PLAN_LIMITS[plan.tier];

        return {
            allowed: limits.realTimeNotifications,
            reason: limits.realTimeNotifications ? undefined : 'Real-time notifications not available on Free/Basic plans',
        };
    }

    /**
     * Check if user can access bulk verification
     */
    canUseBulkVerification(userId: string): AccessControlResult {
        const plan = this.userPlans.get(userId);

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        const limits = PLAN_LIMITS[plan.tier];

        return {
            allowed: limits.bulkVerification,
            reason: limits.bulkVerification ? undefined : 'Bulk verification not available on Free/Basic/Pro plans',
        };
    }

    /**
     * Check if user can use custom endpoints
     */
    canUseCustomEndpoints(userId: string): AccessControlResult {
        const plan = this.userPlans.get(userId);

        if (!plan) {
            return {
                allowed: false,
                reason: 'No plan assigned',
            };
        }

        const limits = PLAN_LIMITS[plan.tier];

        return {
            allowed: limits.customEndpoints,
            reason: limits.customEndpoints ? undefined : 'Custom endpoints only available on Enterprise plan',
        };
    }

    /**
     * Check if user has priority support
     */
    hasPrioritySupport(userId: string): boolean {
        const plan = this.userPlans.get(userId);
        if (!plan) return false;
        return PLAN_LIMITS[plan.tier].prioritySupport;
    }

    /**
     * Get max confirmations for user
     */
    getMaxConfirmations(userId: string): number {
        const plan = this.userPlans.get(userId);
        const tier = plan?.tier || this.defaultPlan;
        return PLAN_LIMITS[tier].maxConfirmations;
    }

    // ========================================================================
    // WALLET MANAGEMENT
    // ========================================================================

    /**
     * Add wallet to user
     */
    addWallet(userId: string, walletAddress: string): AccessControlResult {
        const canAdd = this.canAddWallet(userId);

        if (!canAdd.allowed) {
            return canAdd;
        }

        const plan = this.userPlans.get(userId);
        if (plan) {
            plan.wallets.push(walletAddress);
        }

        return {
            allowed: true,
            remaining: plan ? plan.maxWallets - plan.wallets.length : 0,
            limit: plan?.maxWallets || 0,
        };
    }

    /**
     * Remove wallet from user
     */
    removeWallet(userId: string, walletAddress: string): boolean {
        const plan = this.userPlans.get(userId);
        if (!plan) return false;

        const index = plan.wallets.indexOf(walletAddress);
        if (index > -1) {
            plan.wallets.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
     * Get user wallets
     */
    getUserWallets(userId: string): string[] {
        const plan = this.userPlans.get(userId);
        return plan?.wallets || [];
    }

    // ========================================================================
    // USAGE METRICS
    // ========================================================================

    /**
     * Get usage metrics
     */
    getUsageMetrics(userId: string): UsageMetrics | null {
        const plan = this.userPlans.get(userId);
        if (!plan) return null;

        return this.usageTracker.getMetrics(userId, plan.tier);
    }

    /**
     * Reset user usage
     */
    resetUserUsage(userId: string): void {
        this.usageTracker.resetUsage(userId);
    }

    // ========================================================================
    // NETWORK ACCESS
    // ========================================================================

    /**
     * Check if user can access a network
     * All plans can access Ethereum and BSC, higher plans get more networks
     */
    canAccessNetwork(userId: string, network: BlockchainNetwork): boolean {
        const tier = this.getUserTier(userId);

        // Define network access by tier
        const networkAccess: Record<PlanTier, BlockchainNetwork[]> = {
            free: ['ethereum', 'bsc'],
            basic: ['ethereum', 'bsc', 'polygon'],
            pro: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'],
            enterprise: Object.keys(NETWORK_CONFIGS) as BlockchainNetwork[],
        };

        const allowedNetworks = networkAccess[tier];
        return allowedNetworks.includes(network);
    }

    /**
     * Get accessible networks for user
     */
    getAccessibleNetworks(userId: string): BlockchainNetwork[] {
        const tier = this.getUserTier(userId);

        const networkAccess: Record<PlanTier, BlockchainNetwork[]> = {
            free: ['ethereum', 'bsc'],
            basic: ['ethereum', 'bsc', 'polygon'],
            pro: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'],
            enterprise: Object.keys(NETWORK_CONFIGS) as BlockchainNetwork[],
        };

        return networkAccess[tier];
    }

    // ========================================================================
    // PLAN INFO
    // ========================================================================

    /**
     * Get plan limits
     */
    getPlanLimits(tier: PlanTier): PlanLimits {
        return PLAN_LIMITS[tier];
    }

    /**
     * Get all plan tiers
     */
    getAllPlanTiers(): PlanTier[] {
        return ['free', 'basic', 'pro', 'enterprise'];
    }

    /**
     * Get plan comparison
     */
    getPlanComparison(): Record<PlanTier, PlanLimits> {
        return PLAN_LIMITS;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let accessControllerInstance: AccessController | null = null;

export function getAccessController(): AccessController {
    if (!accessControllerInstance) {
        accessControllerInstance = new AccessController();
    }
    return accessControllerInstance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has access to a feature
 */
export function hasFeature(userId: string, feature: string): boolean {
    const controller = getAccessController();
    return controller.canAccessFeature(userId, feature).allowed;
}

/**
 * Check if user can make API call (with auto-record)
 */
export function checkApiAccess(userId: string): AccessControlResult {
    const controller = getAccessController();
    return controller.canMakeApiCall(userId);
}

/**
 * Check if user can use webhooks
 */
export function canUseWebhooks(userId: string): boolean {
    const controller = getAccessController();
    return controller.canUseWebhook(userId).allowed;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AccessController;

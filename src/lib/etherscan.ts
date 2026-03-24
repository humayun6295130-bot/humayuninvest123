/**
 * Etherscan API V2 Configuration and Constants
 * 
 * This module provides configuration for Etherscan API V2 integration
 * supporting multiple blockchain networks and plan-based access control.
 * 
 * @version 1.0.0
 * @author Investment Platform Team
 */

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

export type BlockchainNetwork = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'fantom';

export interface NetworkConfig {
    name: string;
    chainId: number;
    symbol: string;
    explorerUrl: string;
    apiBaseUrl: string;
    apiDocsUrl: string;
    contractType: 'native' | 'erc20' | 'both';
}

export const NETWORK_CONFIGS: Record<BlockchainNetwork, NetworkConfig> = {
    ethereum: {
        name: 'Ethereum',
        chainId: 1,
        symbol: 'ETH',
        explorerUrl: 'https://etherscan.io',
        apiBaseUrl: 'https://api.etherscan.io/api',
        apiDocsUrl: 'https://docs.etherscan.io',
        contractType: 'both',
    },
    bsc: {
        name: 'BNB Smart Chain',
        chainId: 56,
        symbol: 'BNB',
        explorerUrl: 'https://bscscan.com',
        apiBaseUrl: 'https://api.etherscan.io/api', // Uses Etherscan V2 API
        apiDocsUrl: 'https://docs.bscscan.com',
        contractType: 'both',
    },
    polygon: {
        name: 'Polygon',
        chainId: 137,
        symbol: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
        apiBaseUrl: 'https://api.etherscan.io/api', // Uses Etherscan V2 API
        apiDocsUrl: 'https://docs.polygonscan.com',
        contractType: 'both',
    },
    arbitrum: {
        name: 'Arbitrum One',
        chainId: 42161,
        symbol: 'ETH',
        explorerUrl: 'https://arbiscan.io',
        apiBaseUrl: 'https://api.etherscan.io/api', // Uses Etherscan V2 API
        apiDocsUrl: 'https://docs.arbscan.com',
        contractType: 'both',
    },
    optimism: {
        name: 'Optimism',
        chainId: 10,
        symbol: 'ETH',
        explorerUrl: 'https://optimistic.etherscan.io',
        apiBaseUrl: 'https://api.etherscan.io/api', // Uses Etherscan V2 API
        apiDocsUrl: 'https://docs-optimistic.etherscan.io',
        contractType: 'both',
    },
    avalanche: {
        name: 'Avalanche C-Chain',
        chainId: 43114,
        symbol: 'AVAX',
        explorerUrl: 'https://snowtrace.io',
        apiBaseUrl: 'https://api.etherscan.io/api', // Uses Etherscan V2 API
        apiDocsUrl: 'https://docs.snowtrace.io',
        contractType: 'both',
    },
    fantom: {
        name: 'Fantom',
        chainId: 250,
        symbol: 'FTM',
        explorerUrl: 'https://ftmscan.com',
        apiBaseUrl: 'https://api.etherscan.io/api', // Uses Etherscan V2 API
        apiDocsUrl: 'https://docs.ftmscan.com',
        contractType: 'both',
    },
};

// ============================================================================
// TOKEN CONTRACTS
// ============================================================================

export interface TokenConfig {
    symbol: string;
    name: string;
    decimals: number;
    contractAddress: string;
    networks: BlockchainNetwork[];
    isNative: boolean;
}

export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
    // USDT - Tether USD
    USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        networks: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
        isNative: false,
    },
    // USDC - USD Coin
    USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        networks: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
        isNative: false,
    },
    // BNB
    BNB: {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        contractAddress: '0x0000000000000000000000000000000000000000', // Native token
        networks: ['bsc'],
        isNative: true,
    },
    // ETH
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        contractAddress: '0x0000000000000000000000000000000000000000', // Native token
        networks: ['ethereum', 'arbitrum', 'optimism'],
        isNative: true,
    },
    // MATIC
    MATIC: {
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        contractAddress: '0x0000000000000000000000000000000000000000', // Native token
        networks: ['polygon'],
        isNative: true,
    },
    // AVAX
    AVAX: {
        symbol: 'AVAX',
        name: 'Avalanche',
        decimals: 18,
        contractAddress: '0x0000000000000000000000000000000000000000', // Native token
        networks: ['avalanche'],
        isNative: true,
    },
    // FTM
    FTM: {
        symbol: 'FTM',
        name: 'Fantom',
        decimals: 18,
        contractAddress: '0x0000000000000000000000000000000000000000', // Native token
        networks: ['fantom'],
        isNative: true,
    },
    // BUSD
    BUSD: {
        symbol: 'BUSD',
        name: 'Binance USD',
        decimals: 18,
        contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        networks: ['bsc'],
        isNative: false,
    },
    // DAI
    DAI: {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        contractAddress: '0x6B175474E89094C44Da98b954EescdeCB5c811',
        networks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
        isNative: false,
    },
};

// ============================================================================
// PLAN TIER CONFIGURATION
// ============================================================================

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanLimits {
    name: string;
    monthlyApiCalls: number;
    maxWallets: number;
    realTimeNotifications: boolean;
    webhookSupport: boolean;
    bulkVerification: boolean;
    customEndpoints: boolean;
    prioritySupport: boolean;
    maxConfirmations: number;
    rateLimitPerSecond: number;
    retryAttempts: number;
    features: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    free: {
        name: 'Free',
        monthlyApiCalls: 1000,
        maxWallets: 1,
        realTimeNotifications: false,
        webhookSupport: false,
        bulkVerification: false,
        customEndpoints: false,
        prioritySupport: false,
        maxConfirmations: 12,
        rateLimitPerSecond: 1,
        retryAttempts: 2,
        features: [
            'Basic transaction verification',
            'Manual payment checks',
            'Email notifications',
            'Transaction history (last 100)',
        ],
    },
    basic: {
        name: 'Basic',
        monthlyApiCalls: 5000,
        maxWallets: 3,
        realTimeNotifications: false,
        webhookSupport: false,
        bulkVerification: false,
        customEndpoints: false,
        prioritySupport: false,
        maxConfirmations: 12,
        rateLimitPerSecond: 3,
        retryAttempts: 3,
        features: [
            'Basic transaction verification',
            'Auto payment checks',
            'Email notifications',
            'Transaction history (last 1000)',
            'Duplicate detection',
            'Basic audit logging',
        ],
    },
    pro: {
        name: 'Pro',
        monthlyApiCalls: 25000,
        maxWallets: 10,
        realTimeNotifications: true,
        webhookSupport: true,
        bulkVerification: false,
        customEndpoints: false,
        prioritySupport: true,
        maxConfirmations: 19,
        rateLimitPerSecond: 10,
        retryAttempts: 5,
        features: [
            'Advanced transaction verification',
            'Real-time notifications',
            'Webhook integrations',
            'Multiple wallet support',
            'Transaction history (unlimited)',
            'Duplicate detection',
            'Full audit logging',
            'Gas fee optimization',
            'Token transfer verification',
            'Priority support',
        ],
    },
    enterprise: {
        name: 'Enterprise',
        monthlyApiCalls: -1, // Unlimited
        maxWallets: -1, // Unlimited
        realTimeNotifications: true,
        webhookSupport: true,
        bulkVerification: true,
        customEndpoints: true,
        prioritySupport: true,
        maxConfirmations: 19,
        rateLimitPerSecond: 50,
        retryAttempts: 10,
        features: [
            'Everything in Pro',
            'Unlimited API calls',
            'Unlimited wallets',
            'Bulk verification',
            'Custom API endpoints',
            'Dedicated support',
            'SLA guarantee',
            'Advanced analytics',
            'White-label options',
            'Custom integrations',
        ],
    },
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

export interface EtherscanApiConfig {
    apiKey: string;
    network: BlockchainNetwork;
    baseUrl: string;
    rateLimit: number;
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
}

export const DEFAULT_API_CONFIG: Omit<EtherscanApiConfig, 'apiKey'> = {
    network: 'ethereum',
    baseUrl: NETWORK_CONFIGS.ethereum.apiBaseUrl,
    rateLimit: 5, // requests per second
    retryAttempts: 3,
    retryDelay: 1000, // ms
    timeout: 30000, // ms
};

// ============================================================================
// TRANSACTION STATUS
// ============================================================================

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'reverted' | 'unknown';

export type PaymentVerificationStatus =
    | 'pending'
    | 'verifying'
    | 'confirmed'
    | 'failed'
    | 'duplicate'
    | 'insufficient_confirmations'
    | 'invalid_recipient'
    | 'invalid_amount'
    | 'invalid_sender'
    | 'invalid_hash'
    | 'not_found'
    | 'error';

export interface TransactionStatusInfo {
    status: TransactionStatus;
    confirmations: number;
    blockNumber: number;
    blockHash: string;
    timestamp: number;
    isFinalized: boolean;
}

// ============================================================================
// VERIFICATION CONFIGURATION
// ============================================================================

export interface VerificationConfig {
    minConfirmations: number;
    expectedRecipient?: string;
    expectedAmount?: number;
    amountTolerance?: number; // Percentage tolerance for amount comparison
    checkDuplicate: boolean;
    validateReceipt: boolean;
    checkFailedStatus: boolean;
}

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
    minConfirmations: 12,
    amountTolerance: 1, // 1% tolerance
    checkDuplicate: true,
    validateReceipt: true,
    checkFailedStatus: true,
};

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

export interface WebhookConfig {
    url: string;
    secret: string;
    events: WebhookEventType[];
    retryPolicy: WebhookRetryPolicy;
    enabled: boolean;
}

export type WebhookEventType =
    | 'payment.confirmed'
    | 'payment.failed'
    | 'payment.duplicate'
    | 'payment.pending'
    | 'wallet.balance_changed'
    | 'transaction.reverted';

export interface WebhookRetryPolicy {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
}

export const DEFAULT_WEBHOOK_CONFIG: Omit<WebhookConfig, 'url' | 'secret'> = {
    events: ['payment.confirmed', 'payment.failed', 'payment.duplicate'],
    retryPolicy: {
        maxRetries: 3,
        retryDelay: 5000,
        exponentialBackoff: true,
    },
    enabled: false,
};

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    queueEnabled: boolean;
    maxQueueSize: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 1000,
    queueEnabled: true,
    maxQueueSize: 100,
};

// ============================================================================
// GAS OPTIMIZATION
// ============================================================================

export interface GasOptimizationConfig {
    suggestOptimalGas: boolean;
    gasPriceSource: 'fastest' | 'fast' | 'average' | 'safe';
    maxGasPriceGwei: number;
    includeBuffer: boolean;
    bufferPercentage: number;
}

export const DEFAULT_GAS_CONFIG: GasOptimizationConfig = {
    suggestOptimalGas: true,
    gasPriceSource: 'fast',
    maxGasPriceGwei: 100,
    includeBuffer: true,
    bufferPercentage: 20,
};

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogConfig {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
    includeRequestBody: boolean;
    includeResponseBody: boolean;
    maskSensitiveData: boolean;
}

export const DEFAULT_AUDIT_CONFIG: AuditLogConfig = {
    enabled: true,
    logLevel: 'info',
    retentionDays: 90,
    includeRequestBody: true,
    includeResponseBody: false,
    maskSensitiveData: true,
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
    INVALID_API_KEY: 'Invalid or missing Etherscan API key',
    RATE_LIMIT_EXCEEDED: 'API rate limit exceeded. Please try again later.',
    NETWORK_ERROR: 'Network error while connecting to blockchain API',
    TRANSACTION_NOT_FOUND: 'Transaction not found on the blockchain',
    INVALID_HASH: 'Invalid transaction hash format',
    INVALID_ADDRESS: 'Invalid wallet address format',
    INSUFFICIENT_CONFIRMATIONS: 'Transaction has insufficient confirmations',
    INVALID_RECIPIENT: 'Transaction recipient does not match expected address',
    INVALID_AMOUNT: 'Transaction amount does not match expected amount',
    TRANSACTION_FAILED: 'Transaction failed or was reverted',
    DUPLICATE_TRANSACTION: 'This transaction has already been processed',
    WALLET_NOT_CONFIGURED: 'Admin wallet address not configured',
    PLAN_LIMIT_EXCEEDED: 'Your plan limit has been exceeded',
    WEBHOOK_FAILED: 'Failed to send webhook notification',
    INTERNAL_ERROR: 'Internal server error occurred',
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get network configuration by chain ID
 */
export function getNetworkByChainId(chainId: number): BlockchainNetwork | null {
    const entries = Object.entries(NETWORK_CONFIGS) as [BlockchainNetwork, NetworkConfig][];
    const found = entries.find(([_, config]) => config.chainId === chainId);
    return found ? found[0] : null;
}

/**
 * Get network configuration by name
 */
export function getNetworkByName(name: string): NetworkConfig | null {
    const network = name.toLowerCase() as BlockchainNetwork;
    return NETWORK_CONFIGS[network] || null;
}

/**
 * Get token configuration by symbol
 */
export function getTokenConfig(symbol: string): TokenConfig | null {
    return TOKEN_CONFIGS[symbol.toUpperCase()] || null;
}

/**
 * Get token contract address for a specific network
 */
export function getTokenContractAddress(symbol: string, network: BlockchainNetwork): string | null {
    const token = getTokenConfig(symbol);
    if (!token) return null;
    if (!token.networks.includes(network)) return null;
    return token.contractAddress;
}

/**
 * Check if a token is native to a network
 */
export function isNativeToken(symbol: string, network: BlockchainNetwork): boolean {
    const token = getTokenConfig(symbol);
    if (!token) return false;
    return token.isNative && token.networks.includes(network);
}

/**
 * Get plan limits for a specific tier
 */
export function getPlanLimits(tier: PlanTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

/**
 * Format Wei to human readable format
 */
export function formatWei(wei: string, decimals: number): string {
    const value = BigInt(wei);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, decimals);
    return `${whole}.${fractionalStr}`;
}

/**
 * Format human readable to Wei
 */
export function formatToWei(amount: string, decimals: number): string {
    const parts = amount.split('.');
    const whole = parts[0];
    const fractional = parts[1] || '';
    const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + paddedFractional).toString();
}

/**
 * Validate Ethereum address format
 */
export function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(network: BlockchainNetwork, path: string, txHash?: string): string {
    const config = NETWORK_CONFIGS[network];
    if (txHash) {
        return `${config.explorerUrl}/tx/${txHash}`;
    }
    return `${config.explorerUrl}/${path}`;
}

/**
 * Format confirmations for display
 */
export function formatConfirmations(current: number, required: number): string {
    return `${current}/${required}`;
}

/**
 * Check if transaction is finalized
 */
export function isTransactionFinalized(confirmations: number, requiredConfirmations: number): boolean {
    return confirmations >= requiredConfirmations;
}

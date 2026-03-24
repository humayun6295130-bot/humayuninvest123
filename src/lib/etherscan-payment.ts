/**
 * Payment Verification Service
 * 
 * A comprehensive payment verification service supporting multiple blockchains,
 * real-time transaction monitoring, and automatic payment status updates.
 * 
 * @version 1.0.0
 * @author Investment Platform Team
 */

import {
    BlockchainNetwork,
    PaymentVerificationStatus,
    VerificationConfig,
    DEFAULT_VERIFICATION_CONFIG,
    ERROR_MESSAGES,
    TOKEN_CONFIGS,
    getTokenConfig,
    isValidEthAddress,
    isValidTxHash,
    formatWei,
} from './etherscan';

import { EtherscanClient, createEtherscanClient } from './etherscan-client';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentVerificationRequest {
    txHash: string;
    network: BlockchainNetwork;
    token: string;
    expectedRecipient?: string;
    expectedAmount?: number;
    minConfirmations?: number;
    senderAddress?: string;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface PaymentVerificationResult {
    valid: boolean;
    status: PaymentVerificationStatus;
    txHash: string;
    network: BlockchainNetwork;
    token: string;
    sender: string;
    recipient: string;
    amount: string;
    amountFormatted: string;
    confirmations: number;
    blockNumber?: number;
    blockHash?: string;
    timestamp?: number;
    isFinalized: boolean;
    error?: string;
    metadata?: Record<string, any>;
}

export interface TransactionReceipt {
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    status: boolean;
    logs: any[];
    logsBloom: string;
}

export interface GasSuggestion {
    slow: string;
    average: string;
    fast: string;
    estimatedFee: string;
    estimatedFeeUSD?: string;
    bufferApplied: boolean;
}

export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    event: string;
    txHash: string;
    userId?: string;
    network: BlockchainNetwork;
    status: PaymentVerificationStatus;
    details: Record<string, any>;
}

// ============================================================================
// PROCESSED TRANSACTION CACHE
// ============================================================================

class ProcessedTransactionCache {
    private cache: Map<string, { timestamp: number; result: PaymentVerificationResult }> = new Map();
    private maxSize: number = 10000;
    private ttl: number = 24 * 60 * 60 * 1000; // 24 hours

    set(key: string, result: PaymentVerificationResult): void {
        // Evict oldest if cache is full
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            timestamp: Date.now(),
            result,
        });
    }

    get(key: string): PaymentVerificationResult | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.result;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

// ============================================================================
// AUDIT LOG
// ============================================================================

class AuditLog {
    private logs: AuditLogEntry[] = [];
    private maxLogs: number = 10000;
    private enabled: boolean = true;

    constructor(enabled: boolean = true) {
        this.enabled = enabled;
    }

    log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
        if (!this.enabled) return;

        const logEntry: AuditLogEntry = {
            ...entry,
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };

        this.logs.push(logEntry);

        // Trim old logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUDIT] ${entry.event}:`, JSON.stringify(entry));
        }
    }

    getLogs(filters?: {
        userId?: string;
        txHash?: string;
        event?: string;
        network?: BlockchainNetwork;
        startDate?: Date;
        endDate?: Date;
    }): AuditLogEntry[] {
        let filtered = [...this.logs];

        if (filters) {
            if (filters.userId) {
                filtered = filtered.filter(log => log.userId === filters.userId);
            }
            if (filters.txHash) {
                filtered = filtered.filter(log => log.txHash === filters.txHash);
            }
            if (filters.event) {
                filtered = filtered.filter(log => log.event === filters.event);
            }
            if (filters.network) {
                filtered = filtered.filter(log => log.network === filters.network);
            }
            if (filters.startDate) {
                filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
            }
            if (filters.endDate) {
                filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
            }
        }

        return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    clear(): void {
        this.logs = [];
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}

// ============================================================================
// PAYMENT VERIFICATION SERVICE
// ============================================================================

export class PaymentVerificationService {
    private clients: Map<BlockchainNetwork, EtherscanClient> = new Map();
    private defaultApiKey: string;
    private processedCache: ProcessedTransactionCache;
    private auditLog: AuditLog;
    private config: VerificationConfig;

    // Event handlers
    private onPaymentConfirmed?: (result: PaymentVerificationResult) => void;
    private onPaymentFailed?: (result: PaymentVerificationResult) => void;
    private onPaymentPending?: (result: PaymentVerificationResult) => void;

    constructor(
        defaultApiKey: string,
        config: Partial<VerificationConfig> = {},
        auditEnabled: boolean = true
    ) {
        this.defaultApiKey = defaultApiKey;
        this.config = { ...DEFAULT_VERIFICATION_CONFIG, ...config };
        this.processedCache = new ProcessedTransactionCache();
        this.auditLog = new AuditLog(auditEnabled);
    }

    // ========================================================================
    // CLIENT MANAGEMENT
    // ========================================================================

    /**
     * Add or update client for a network
     */
    addNetworkClient(network: BlockchainNetwork, apiKey?: string): void {
        const key = apiKey || this.defaultApiKey;
        this.clients.set(network, createEtherscanClient(key, network));
    }

    /**
     * Get client for a network
     */
    getClient(network: BlockchainNetwork): EtherscanClient | undefined {
        return this.clients.get(network);
    }

    /**
     * Get or create client for a network
     */
    getOrCreateClient(network: BlockchainNetwork): EtherscanClient {
        let client = this.clients.get(network);
        if (!client) {
            client = createEtherscanClient(this.defaultApiKey, network);
            this.clients.set(network, client);
        }
        return client;
    }

    /**
     * Remove client for a network
     */
    removeNetworkClient(network: BlockchainNetwork): void {
        this.clients.delete(network);
    }

    // ========================================================================
    // VERIFICATION METHODS
    // ========================================================================

    /**
     * Verify a payment transaction
     */
    async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
        const { txHash, network, token, expectedRecipient, expectedAmount, minConfirmations, senderAddress, userId, metadata } = request;

        // Validate transaction hash
        if (!isValidTxHash(txHash)) {
            const result = this.createErrorResult(txHash, network, token, 'invalid_hash');
            this.logVerification(result, 'Invalid transaction hash', userId);
            return result;
        }

        // Check for duplicate
        if (this.config.checkDuplicate) {
            const cached = this.processedCache.get(txHash);
            if (cached) {
                const result = {
                    ...cached,
                    status: 'duplicate' as PaymentVerificationStatus,
                };
                this.logVerification(result, 'Duplicate transaction detected', userId);
                return result;
            }
        }

        try {
            // Get client for network
            const client = this.getOrCreateClient(network);

            // Get token configuration
            const tokenConfig = getTokenConfig(token);
            if (!tokenConfig) {
                throw new Error(`Unsupported token: ${token}`);
            }

            // Get transaction details
            const tx = await client.getTransactionByHash(txHash);
            if (!tx) {
                const result = this.createErrorResult(txHash, network, token, 'not_found');
                this.logVerification(result, 'Transaction not found on blockchain', userId);
                return result;
            }

            // Check for failed transaction
            if (this.config.checkFailedStatus) {
                const status = await client.checkTransactionStatus(txHash);
                if (status.isFailed) {
                    const result = this.createErrorResult(txHash, network, token, 'failed', tx);
                    this.logVerification(result, 'Transaction failed or reverted', userId);
                    return result;
                }
            }

            // Parse transaction data
            const txValue = BigInt(tx.value || '0');
            const decimals = tokenConfig?.decimals || 18;
            const amountFormatted = formatWei(txValue.toString(), decimals);

            // Validate recipient
            const recipient = tx.to || '';
            if (expectedRecipient && recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
                const result = this.createErrorResult(txHash, network, token, 'invalid_recipient', tx);
                this.logVerification(result, `Invalid recipient: expected ${expectedRecipient}, got ${recipient}`, userId);
                return result;
            }

            // Validate amount
            if (expectedAmount !== undefined) {
                const expectedWei = BigInt(Math.round(expectedAmount * Math.pow(10, decimals)));
                const tolerance = BigInt(Math.round(Number(expectedWei) * (this.config.amountTolerance || 0) / 100));
                const diff = txValue > expectedWei ? txValue - expectedWei : expectedWei - txValue;

                if (diff > tolerance) {
                    const result = this.createErrorResult(txHash, network, token, 'invalid_amount', tx);
                    this.logVerification(result, `Invalid amount: expected ${expectedAmount}, got ${amountFormatted}`, userId);
                    return result;
                }
            }

            // Validate sender address
            if (senderAddress && tx.from.toLowerCase() !== senderAddress.toLowerCase()) {
                const result = this.createErrorResult(txHash, network, token, 'invalid_sender', tx);
                this.logVerification(result, `Invalid sender: expected ${senderAddress}, got ${tx.from}`, userId);
                return result;
            }

            // Get confirmations
            const currentBlock = await client.getCurrentBlock();
            const txBlock = tx.blockNumber ? parseInt(tx.blockNumber, 16) : 0;
            const confirmations = currentBlock - txBlock;

            const requiredConfirmations = minConfirmations || this.config.minConfirmations;
            const isFinalized = confirmations >= requiredConfirmations;

            // Build successful result
            const result: PaymentVerificationResult = {
                valid: isFinalized,
                status: isFinalized ? 'confirmed' : 'insufficient_confirmations',
                txHash,
                network,
                token,
                sender: tx.from,
                recipient,
                amount: txValue.toString(),
                amountFormatted,
                confirmations,
                blockNumber: txBlock,
                blockHash: tx.blockHash,
                timestamp: tx.timeStamp ? parseInt(tx.timeStamp) * 1000 : undefined,
                isFinalized,
                metadata,
            };

            // Cache the result
            if (this.config.checkDuplicate) {
                this.processedCache.set(txHash, result);
            }

            // Log the verification
            this.logVerification(result, isFinalized ? 'Payment confirmed' : 'Awaiting confirmations', userId);

            // Trigger events
            if (isFinalized) {
                this.onPaymentConfirmed?.(result);
            } else if (confirmations > 0) {
                this.onPaymentPending?.(result);
            }

            return result;
        } catch (error: any) {
            const result = this.createErrorResult(txHash, network, token, 'error', undefined, error.message);
            this.logVerification(result, `Error: ${error.message}`, userId);
            return result;
        }
    }

    /**
     * Verify transaction receipt
     */
    async verifyReceipt(txHash: string, network: BlockchainNetwork): Promise<{
        valid: boolean;
        receipt: TransactionReceipt | null;
        error?: string;
    }> {
        try {
            const client = this.getOrCreateClient(network);
            const receipt = await client.getTransactionReceiptFull(txHash);

            if (!receipt) {
                return { valid: false, receipt: null, error: 'Transaction receipt not found' };
            }

            const txReceipt: TransactionReceipt = {
                blockNumber: receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : 0,
                blockHash: receipt.blockHash || '',
                transactionHash: receipt.transactionHash || txHash,
                from: receipt.from || '',
                to: receipt.to || '',
                value: receipt.value || '0',
                gasUsed: receipt.gasUsed || '0',
                status: receipt.status === '0x1',
                logs: receipt.logs || [],
                logsBloom: receipt.logsBloom || '',
            };

            return { valid: txReceipt.status, receipt: txReceipt };
        } catch (error: any) {
            return { valid: false, receipt: null, error: error.message };
        }
    }

    /**
     * Check transaction confirmations
     */
    async checkConfirmations(txHash: string, network: BlockchainNetwork): Promise<{
        confirmations: number;
        blockNumber: number;
        isFinalized: boolean;
    }> {
        const client = this.getOrCreateClient(network);
        const currentBlock = await client.getCurrentBlock();
        const tx = await client.getTransactionByHash(txHash);

        if (!tx || !tx.blockNumber) {
            return { confirmations: 0, blockNumber: 0, isFinalized: false };
        }

        const txBlock = parseInt(tx.blockNumber, 16);
        const confirmations = currentBlock - txBlock;

        return {
            confirmations,
            blockNumber: txBlock,
            isFinalized: confirmations >= this.config.minConfirmations,
        };
    }

    // ========================================================================
    // WALLET BALANCE
    // ========================================================================

    /**
     * Get wallet balance
     */
    async getWalletBalance(address: string, network: BlockchainNetwork): Promise<{
        balance: string;
        balanceFormatted: string;
        error?: string;
    }> {
        try {
            const client = this.getOrCreateClient(network);
            const config = client.getNetworkConfig();
            const balance = await client.getAccountBalance(address);

            return {
                balance,
                balanceFormatted: formatWei(balance, 18),
            };
        } catch (error: any) {
            return { balance: '0', balanceFormatted: '0', error: error.message };
        }
    }

    /**
     * Get multiple wallet balances
     */
    async getMultipleBalances(
        addresses: string[],
        network: BlockchainNetwork
    ): Promise<Array<{ address: string; balance: string; balanceFormatted: string }>> {
        try {
            const client = this.getOrCreateClient(network);
            const balances = await client.getMultipleAccountBalances(addresses);

            return balances.map(item => ({
                address: item.account,
                balance: item.balance,
                balanceFormatted: formatWei(item.balance, 18),
            }));
        } catch (error: any) {
            return addresses.map(address => ({
                address,
                balance: '0',
                balanceFormatted: '0',
            }));
        }
    }

    /**
     * Get token balance for wallet
     */
    async getTokenBalance(
        address: string,
        token: string,
        network: BlockchainNetwork
    ): Promise<{
        balance: string;
        balanceFormatted: string;
        error?: string;
    }> {
        try {
            const tokenConfig = getTokenConfig(token);
            if (!tokenConfig) {
                return { balance: '0', balanceFormatted: '0', error: `Unsupported token: ${token}` };
            }

            const client = this.getOrCreateClient(network);
            const balance = await client.getTokenBalance(address, tokenConfig.contractAddress);

            return {
                balance,
                balanceFormatted: formatWei(balance, tokenConfig.decimals),
            };
        } catch (error: any) {
            return { balance: '0', balanceFormatted: '0', error: error.message };
        }
    }

    // ========================================================================
    // GAS OPTIMIZATION
    // ========================================================================

    /**
     * Get gas fee suggestions
     */
    async getGasSuggestions(
        network: BlockchainNetwork,
        options: {
            includeBuffer?: boolean;
            bufferPercentage?: number;
        } = {}
    ): Promise<GasSuggestion | null> {
        try {
            const client = this.getOrCreateClient(network);
            const gasPrices = await client.estimateGasPrice();
            const oracle = await client.getGasOracle();

            const bufferPercentage = options.bufferPercentage || 20;
            const applyBuffer = options.includeBuffer !== false;

            const fastGwei = parseFloat(gasPrices.fast);
            const fastWei = BigInt(Math.round(fastGwei * 1e9));
            const estimatedFee = applyBuffer
                ? fastWei * BigInt(21000) * BigInt(100 + bufferPercentage) / BigInt(100)
                : fastWei * BigInt(21000);

            return {
                slow: gasPrices.slow,
                average: gasPrices.average,
                fast: gasPrices.fast,
                estimatedFee: estimatedFee.toString(),
                estimatedFeeUSD: oracle.suggestBaseFee,
                bufferApplied: applyBuffer,
            };
        } catch (error: any) {
            return null;
        }
    }

    // ========================================================================
    // DUPLICATE DETECTION
    // ========================================================================

    /**
     * Check for duplicate transaction
     */
    isDuplicate(txHash: string): boolean {
        return this.processedCache.has(txHash);
    }

    /**
     * Mark transaction as processed
     */
    markAsProcessed(txHash: string, result: PaymentVerificationResult): void {
        this.processedCache.set(txHash, result);
    }

    /**
     * Clear duplicate cache
     */
    clearCache(): void {
        this.processedCache.clear();
    }

    /**
     * Get cache size
     */
    getCacheSize(): number {
        return this.processedCache.size();
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Set payment confirmed callback
     */
    onConfirmed(callback: (result: PaymentVerificationResult) => void): void {
        this.onPaymentConfirmed = callback;
    }

    /**
     * Set payment failed callback
     */
    onFailed(callback: (result: PaymentVerificationResult) => void): void {
        this.onPaymentFailed = callback;
    }

    /**
     * Set payment pending callback
     */
    onPending(callback: (result: PaymentVerificationResult) => void): void {
        this.onPaymentPending = callback;
    }

    // ========================================================================
    // AUDIT LOG
    // ========================================================================

    /**
     * Get audit logs
     */
    getAuditLogs(filters?: {
        userId?: string;
        txHash?: string;
        event?: string;
        network?: BlockchainNetwork;
        startDate?: Date;
        endDate?: Date;
    }): AuditLogEntry[] {
        return this.auditLog.getLogs(filters);
    }

    /**
     * Clear audit logs
     */
    clearAuditLogs(): void {
        this.auditLog.clear();
    }

    /**
     * Enable/disable audit logging
     */
    setAuditEnabled(enabled: boolean): void {
        this.auditLog.setEnabled(enabled);
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private createErrorResult(
        txHash: string,
        network: BlockchainNetwork,
        token: string,
        status: PaymentVerificationStatus,
        tx?: any,
        error?: string
    ): PaymentVerificationResult {
        return {
            valid: false,
            status,
            txHash,
            network,
            token,
            sender: tx?.from || '',
            recipient: tx?.to || '',
            amount: tx?.value || '0',
            amountFormatted: '0',
            confirmations: 0,
            isFinalized: false,
            error: error || ERROR_MESSAGES[status.toUpperCase() as keyof typeof ERROR_MESSAGES] || 'Unknown error',
        };
    }

    private logVerification(result: PaymentVerificationResult, details: string, userId?: string): void {
        this.auditLog.log({
            event: result.valid ? 'payment_verified' : 'verification_failed',
            txHash: result.txHash,
            userId,
            network: result.network,
            status: result.status,
            details: {
                valid: result.valid,
                status: result.status,
                amount: result.amountFormatted,
                confirmations: result.confirmations,
                error: result.error,
                details,
            },
        });
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a payment verification service
 */
export function createPaymentVerificationService(
    apiKey: string,
    config?: Partial<VerificationConfig>,
    auditEnabled?: boolean
): PaymentVerificationService {
    return new PaymentVerificationService(apiKey, config, auditEnabled);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PaymentVerificationService;

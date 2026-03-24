/**
 * Etherscan API V2 Client
 * 
 * A comprehensive client for interacting with Etherscan API V2,
 * featuring rate limiting, retry mechanisms, and queue management.
 * 
 * @version 1.0.0
 * @author Investment Platform Team
 */

import {
    BlockchainNetwork,
    EtherscanApiConfig,
    DEFAULT_API_CONFIG,
    NETWORK_CONFIGS,
    RateLimitConfig,
    DEFAULT_RATE_LIMIT_CONFIG,
    ERROR_MESSAGES,
} from './etherscan';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiResponse<T = any> {
    status: string;
    message: string;
    result: T;
}

export interface TransactionInfo {
    blockNumber: string;
    blockHash: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    transactionIndex: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    cumulativeGasUsed: string;
    input: string;
    confirmations: string;
    isError: string;
    txreceipt_status: string;
    contractAddress?: string;
    logs?: any[];
    logsBloom?: string;
}

export interface TokenTransferInfo {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    blockHash: string;
    from: string;
    contractAddress: string;
    to: string;
    value: string;
    tokenId?: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimal: string;
    transactionIndex: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    cumulativeGasUsed: string;
    input: string;
    confirmations: string;
}

export interface BlockInfo {
    blockNumber: string;
    blockReward: string;
    timeStamp: string;
    transactionFees: string;
    burntFees?: string;
    uncleReward?: string;
}

export interface GasOracle {
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
}

export interface AccountBalance {
    account: string;
    balance: string;
}

export interface TokenBalance {
    contractAddress: string;
    balance: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimal: string;
}

export interface EtherscanError extends Error {
    code?: string;
    status?: string;
    response?: any;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
    private requests: number[] = [];
    private queue: Array<() => Promise<void>> = [];
    private processing = false;
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG) {
        this.config = config;
    }

    async acquire(): Promise<void> {
        return new Promise((resolve) => {
            const attempt = async () => {
                const now = Date.now();
                // Remove requests outside the current window
                this.requests = this.requests.filter(timestamp => now - timestamp < this.config.windowMs);

                if (this.requests.length < this.config.maxRequests) {
                    this.requests.push(now);
                    resolve();
                } else if (this.config.queueEnabled && this.queue.length < this.config.maxQueueSize) {
                    // Add to queue
                    this.queue.push(() => Promise.resolve(resolve()));
                    this.processQueue();
                } else {
                    // Rate limit exceeded
                    const waitTime = this.config.windowMs - (now - this.requests[0]);
                    setTimeout(attempt, Math.max(waitTime, 100));
                }
            };
            attempt();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            this.requests = this.requests.filter(timestamp => now - timestamp < this.config.windowMs);

            if (this.requests.length < this.config.maxRequests) {
                this.requests.push(now);
                const next = this.queue.shift();
                if (next) next();
            } else {
                const waitTime = this.config.windowMs - (now - this.requests[0]);
                await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 100)));
            }
        }

        this.processing = false;
    }

    getQueueSize(): number {
        return this.queue.length;
    }

    getRequestsInWindow(): number {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.config.windowMs);
        return this.requests.length;
    }
}

// ============================================================================
// REQUEST QUEUE
// ============================================================================

interface QueuedRequest {
    id: string;
    promise: Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    retries: number;
    timestamp: number;
}

class RequestQueue {
    private queue: QueuedRequest[] = [];
    private processing = false;
    private maxConcurrent = 5;
    private running = 0;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
    }

    async add<T>(requestFn: () => Promise<T>, retries: number = 3): Promise<T> {
        return new Promise((resolve, reject) => {
            const queuedRequest: QueuedRequest = {
                id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                promise: null as any,
                resolve: resolve as any,
                reject: reject,
                retries,
                timestamp: Date.now(),
            };

            queuedRequest.promise = new Promise(async (res, rej) => {
                while (this.running >= this.maxConcurrent) {
                    await new Promise(r => setTimeout(r, 100));
                }

                this.running++;
                try {
                    const result = await requestFn();
                    res(result);
                } catch (error) {
                    rej(error);
                } finally {
                    this.running--;
                    this.processNext();
                }
            });

            this.queue.push(queuedRequest);
            this.processNext();
        });
    }

    private processNext(): void {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        // Process queued requests
        const toProcess = this.queue.splice(0, this.maxConcurrent - this.running);
        toProcess.forEach(req => {
            req.promise
                .then(req.resolve)
                .catch(req.reject);
        });

        this.processing = false;
    }

    getQueueLength(): number {
        return this.queue.length;
    }

    clear(): void {
        this.queue.forEach(req => req.reject(new Error('Queue cleared')));
        this.queue = [];
    }
}

// ============================================================================
// RETRY MECHANISM
// ============================================================================

interface RetryOptions {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: string[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
        'rate limit',
        'network',
        'timeout',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
    ],
};

async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable
            const isRetryable = opts.retryableErrors.some(
                err => error.message?.toLowerCase().includes(err.toLowerCase())
            );

            if (!isRetryable || attempt === opts.maxRetries) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelay
            );

            console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// ============================================================================
// ETHERSCAN API CLIENT
// ============================================================================

export class EtherscanClient {
    private apiKey: string;
    private network: BlockchainNetwork;
    private baseUrl: string;
    private rateLimiter: RateLimiter;
    private requestQueue: RequestQueue;
    private config: EtherscanApiConfig;

    // API call counters for monitoring
    private apiCallCount = 0;
    private apiCallErrors = 0;
    private lastReset: Date = new Date();

    constructor(
        apiKey: string,
        network: BlockchainNetwork = 'ethereum',
        config: Partial<EtherscanApiConfig> = {}
    ) {
        this.apiKey = apiKey;
        this.network = network;
        this.baseUrl = config.baseUrl || NETWORK_CONFIGS[network].apiBaseUrl;

        this.config = {
            ...DEFAULT_API_CONFIG,
            ...config,
            apiKey,
            network,
            baseUrl: this.baseUrl,
        };

        this.rateLimiter = new RateLimiter({
            maxRequests: this.config.rateLimit,
            windowMs: 1000,
            queueEnabled: true,
            maxQueueSize: 100,
        });

        this.requestQueue = new RequestQueue(10);
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private getBaseUrl(): string {
        // Etherscan V2 uses single endpoint with network in action parameter
        return 'https://api.etherscan.io/api';
    }

    private async makeRequest<T>(params: Record<string, string>): Promise<T> {
        // Acquire rate limit token
        await this.rateLimiter.acquire();

        // Build URL with query params
        const queryString = new URLSearchParams({
            ...params,
            apikey: this.apiKey,
        }).toString();

        const url = `${this.getBaseUrl()}?${queryString}`;

        return withRetry(async () => {
            this.apiCallCount++;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
                }

                const data: ApiResponse<T> = await response.json();

                // Check for API-level errors
                if (data.status === '0' && data.message !== 'OK') {
                    const errorMsg = data.result?.toString() || ERROR_MESSAGES.NETWORK_ERROR;
                    this.apiCallErrors++;
                    throw new Error(`Etherscan API Error: ${errorMsg}`);
                }

                return data.result;
            } catch (error: any) {
                this.apiCallErrors++;

                if (error.name === 'AbortError') {
                    throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
                }

                throw error;
            }
        }, {
            maxRetries: this.config.retryAttempts,
            initialDelay: this.config.retryDelay,
        });
    }

    // ========================================================================
    // TRANSACTION METHODS
    // ========================================================================

    /**
     * Get transaction receipt status
     */
    async getTransactionReceipt(txHash: string): Promise<TransactionInfo | null> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<TransactionInfo | null>({
                module: 'transaction',
                action: 'gettxreceiptstatus',
                txhash: txHash,
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get transaction details by hash
     */
    async getTransactionByHash(txHash: string): Promise<TransactionInfo | null> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<TransactionInfo | null>({
                module: 'proxy',
                action: 'eth_getTransactionByHash',
                txhash: txHash,
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get transaction receipt (full)
     */
    async getTransactionReceiptFull(txHash: string): Promise<any | null> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<any | null>({
                module: 'proxy',
                action: 'eth_getTransactionReceipt',
                txhash: txHash,
            });
        }, this.config.retryAttempts);
    }

    /**
     * Check if transaction is valid and successful
     */
    async checkTransactionStatus(txHash: string): Promise<{
        isValid: boolean;
        isFailed: boolean;
        status: string;
        confirmations: number;
    }> {
        const receipt = await this.getTransactionReceipt(txHash);
        const tx = await this.getTransactionByHash(txHash);

        if (!tx) {
            return {
                isValid: false,
                isFailed: false,
                status: 'not_found',
                confirmations: 0,
            };
        }

        const confirmations = tx.confirmations ? parseInt(tx.confirmations) : 0;
        const isFailed = tx.isError === '1' || tx.txreceipt_status === '0';

        return {
            isValid: !isFailed,
            isFailed,
            status: isFailed ? 'failed' : 'success',
            confirmations,
        };
    }

    // ========================================================================
    // ACCOUNT METHODS
    // ========================================================================

    /**
     * Get account balance
     */
    async getAccountBalance(address: string): Promise<string> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<string>({
                module: 'account',
                action: 'balance',
                address,
                tag: 'latest',
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get account balance at specific block
     */
    async getAccountBalanceAtBlock(address: string, blockNumber: number): Promise<string> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<string>({
                module: 'account',
                action: 'balance',
                address,
                blockno: blockNumber.toString(),
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get multiple account balances
     */
    async getMultipleAccountBalances(addresses: string[]): Promise<AccountBalance[]> {
        const addressList = addresses.join(',');
        return this.requestQueue.add(async () => {
            return this.makeRequest<AccountBalance[]>({
                module: 'account',
                action: 'balancemulti',
                address: addressList,
                tag: 'latest',
            });
        }, this.config.retryAttempts);
    }

    // ========================================================================
    // TOKEN METHODS
    // ========================================================================

    /**
     * Get token balance for address
     */
    async getTokenBalance(address: string, contractAddress: string): Promise<string> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<string>({
                module: 'account',
                action: 'tokenbalance',
                address,
                contractaddress: contractAddress,
                tag: 'latest',
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get token holders list
     */
    async getTokenHolders(contractAddress: string, page: number = 1, offset: number = 100): Promise<any[]> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<any[]>({
                module: 'token',
                action: 'tokenholderlist',
                contractaddress: contractAddress,
                page: page.toString(),
                offset: offset.toString(),
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get token transfers for an address
     */
    async getTokenTransfers(
        address: string,
        options: {
            contractAddress?: string;
            startBlock?: number;
            endBlock?: number;
            page?: number;
            offset?: number;
            sort?: 'asc' | 'desc';
        } = {}
    ): Promise<TokenTransferInfo[]> {
        return this.requestQueue.add(async () => {
            const params: Record<string, string> = {
                module: 'account',
                action: 'tokentx',
                address,
                sort: options.sort || 'desc',
            };

            if (options.contractAddress) {
                params.contractaddress = options.contractAddress;
            }
            if (options.startBlock) {
                params.startblock = options.startBlock.toString();
            }
            if (options.endBlock) {
                params.endblock = options.endBlock.toString();
            }
            if (options.page) {
                params.page = options.page.toString();
            }
            if (options.offset) {
                params.offset = options.offset.toString();
            }

            return this.makeRequest<TokenTransferInfo[]>(params);
        }, this.config.retryAttempts);
    }

    // ========================================================================
    // BLOCK METHODS
    // ========================================================================

    /**
     * Get block by number
     */
    async getBlockByNumber(blockNumber: number): Promise<any> {
        const hexBlock = '0x' + blockNumber.toString(16);
        return this.requestQueue.add(async () => {
            return this.makeRequest<any>({
                module: 'proxy',
                action: 'eth_getBlockByNumber',
                tag: hexBlock,
                boolean: 'true',
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get block reward and timestamp
     */
    async getBlockReward(blockNumber: number): Promise<BlockInfo> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<BlockInfo>({
                module: 'block',
                action: 'getblockreward',
                blockno: blockNumber.toString(),
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get block count down
     */
    async getBlockCountDown(targetBlock: number): Promise<any> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<any>({
                module: 'block',
                action: 'getblockcountdown',
                blockno: targetBlock.toString(),
            });
        }, this.config.retryAttempts);
    }

    // ========================================================================
    // GAS METHODS
    // ========================================================================

    /**
     * Get gas oracle (current gas prices)
     */
    async getGasOracle(): Promise<GasOracle> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<GasOracle>({
                module: 'gastracker',
                action: 'gasoracle',
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get estimated gas price
     */
    async estimateGasPrice(): Promise<{
        slow: string;
        average: string;
        fast: string;
    }> {
        const oracle = await this.getGasOracle();
        return {
            slow: oracle.SafeGasPrice,
            average: oracle.ProposeGasPrice,
            fast: oracle.FastGasPrice,
        };
    }

    /**
     * Estimate gas for transaction
     */
    async estimateGas(to: string, value: string, data: string = '0x'): Promise<string> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<string>({
                module: 'proxy',
                action: 'eth_estimateGas',
                to,
                value,
                data,
            });
        }, this.config.retryAttempts);
    }

    // ========================================================================
    // CONTRACT METHODS
    // ========================================================================

    /**
     * Get contract ABI
     */
    async getContractAbi(contractAddress: string): Promise<string> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<string>({
                module: 'contract',
                action: 'getabi',
                address: contractAddress,
            });
        }, this.config.retryAttempts);
    }

    /**
     * Get contract creation transaction
     */
    async getContractCreation(contractAddress: string): Promise<any> {
        return this.requestQueue.add(async () => {
            return this.makeRequest<any>({
                module: 'contract',
                action: 'getcontractcreation',
                address: contractAddress,
            });
        }, this.config.retryAttempts);
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Get current block number
     */
    async getCurrentBlock(): Promise<number> {
        return this.requestQueue.add(async () => {
            const result = await this.makeRequest<string>({
                module: 'proxy',
                action: 'eth_blockNumber',
            });
            return parseInt(result, 16);
        }, this.config.retryAttempts);
    }

    /**
     * Get transaction count for address
     */
    async getTransactionCount(address: string): Promise<number> {
        return this.requestQueue.add(async () => {
            const result = await this.makeRequest<string>({
                module: 'proxy',
                action: 'eth_getTransactionCount',
                address,
                tag: 'latest',
            });
            return parseInt(result, 16);
        }, this.config.retryAttempts);
    }

    /**
     * Verify contract code
     */
    async verifyContractCode(contractAddress: string): Promise<boolean> {
        return this.requestQueue.add(async () => {
            const result = await this.makeRequest<string>({
                module: 'proxy',
                action: 'eth_getCode',
                address: contractAddress,
                tag: 'latest',
            });
            return result !== '0x';
        }, this.config.retryAttempts);
    }

    // ========================================================================
    // STATS & MONITORING
    // ========================================================================

    /**
     * Get API usage statistics
     */
    getApiStats(): {
        totalCalls: number;
        errorCount: number;
        successRate: number;
        queueSize: number;
        lastReset: Date;
    } {
        const totalCalls = this.apiCallCount;
        const errorCount = this.apiCallErrors;
        const successRate = totalCalls > 0 ? ((totalCalls - errorCount) / totalCalls) * 100 : 100;

        return {
            totalCalls,
            errorCount,
            successRate,
            queueSize: this.rateLimiter.getQueueSize(),
            lastReset: this.lastReset,
        };
    }

    /**
     * Reset API stats
     */
    resetStats(): void {
        this.apiCallCount = 0;
        this.apiCallErrors = 0;
        this.lastReset = new Date();
    }

    /**
     * Get network configuration
     */
    getNetworkConfig() {
        return NETWORK_CONFIGS[this.network];
    }

    /**
     * Switch network (for display purposes, API uses single endpoint)
     */
    setNetwork(network: BlockchainNetwork): void {
        this.network = network;
        // Note: Etherscan V2 uses single API endpoint, network is identified by action params
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an Etherscan client instance
 */
export function createEtherscanClient(
    apiKey: string,
    network: BlockchainNetwork = 'ethereum',
    config?: Partial<EtherscanApiConfig>
): EtherscanClient {
    return new EtherscanClient(apiKey, network, config);
}

/**
 * Create clients for multiple networks
 */
export function createMultiNetworkClients(
    apiKey: string,
    networks: BlockchainNetwork[]
): Map<BlockchainNetwork, EtherscanClient> {
    const clients = new Map<BlockchainNetwork, EtherscanClient>();

    for (const network of networks) {
        clients.set(network, new EtherscanClient(apiKey, network));
    }

    return clients;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EtherscanClient;

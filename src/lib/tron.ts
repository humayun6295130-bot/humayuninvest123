/**
 * TRON Blockchain Integration Utilities
 * 
 * Features:
 * - Automatic payment verification via TxID
 * - USDT amount confirmation
 * - Transaction confirmation status tracking
 * - Double spending prevention (Firebase-backed)
 * - Wallet balance monitoring
 * - Address validation
 * - Network fee calculation
 * - Smart contract event tracking
 */

import { fetchRow, upsertRow } from '@/firebase/database';

const TRONGRID_API_KEY = process.env.NEXT_PUBLIC_TRONGRID_API_KEY;
const TRONGRID_API_URL = "https://api.trongrid.io";

// USDT TRC-20 Contract Address
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// TRON address validation regex
const TRON_ADDRESS_REGEX = /^T[a-zA-Z0-9]{33}$/;

// Transaction hash validation regex
const TRON_TX_REGEX = /^[a-fA-F0-9]{64}$/;

export interface TronTransaction {
    txID: string;
    blockNumber: number;
    timestamp: number;
    owner_address: string;
    to_address?: string;
    contract_address?: string;
    amount?: number;
    confirmed: boolean;
    confirmations?: number;
    result?: string;
}

export interface TokenTransfer {
    transaction_id: string;
    block_ts: number;
    from_address: string;
    to_address: string;
    quant: string;
    token_info: {
        symbol: string;
        name: string;
        decimals: number;
        address: string;
    };
    confirmed: boolean;
    riskTransaction: boolean;
}

export interface WalletBalance {
    address: string;
    trxBalance: number;
    usdtBalance: number;
    tokens: TokenBalance[];
}

export interface TokenBalance {
    symbol: string;
    name: string;
    decimals: number;
    balance: number;
    contractAddress: string;
}

export interface TransactionFee {
    bandwidthRequired: number;
    energyRequired: number;
    estimatedTrxFee: number;
}

// ==========================================
// Address Validation
// ==========================================

/**
 * Validate TRON address format
 */
export function isValidTronAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    return TRON_ADDRESS_REGEX.test(address);
}

// ==========================================
// Environment Configuration
// ==========================================

// Admin wallet address - MUST be configured in environment
export const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '';

/**
 * Validate TRON transaction hash
 */
export function isValidTransactionHash(txHash: string): boolean {
    if (!txHash || typeof txHash !== 'string') return false;
    return TRON_TX_REGEX.test(txHash);
}

// ==========================================
// API Helpers
// ==========================================

async function fetchTronGrid(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${TRONGRID_API_URL}${endpoint}`;

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers as Record<string, string>,
    };

    // Only add API key if it's configured
    if (TRONGRID_API_KEY) {
        headers['TRON-PRO-API-KEY'] = TRONGRID_API_KEY;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `TRON API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('TRON API Error:', error);
        throw error;
    }
}

// ==========================================
// Transaction Verification
// ==========================================

/**
 * Get transaction details by TxID
 */
export async function getTransactionById(txID: string): Promise<TronTransaction | null> {
    if (!isValidTransactionHash(txID)) {
        throw new Error('Invalid transaction hash format');
    }

    try {
        const data = await fetchTronGrid(`/v1/transactions/${txID}`);

        if (!data.data || data.data.length === 0) {
            return null;
        }

        const tx = data.data[0];
        return {
            txID: tx.txID,
            blockNumber: tx.block_number,
            timestamp: tx.block_timestamp,
            owner_address: tx.owner_address,
            to_address: tx.to_address,
            contract_address: tx.contract_address,
            amount: tx.amount,
            confirmed: tx.confirmed,
            confirmations: tx.confirmations,
            result: tx.ret?.[0]?.contractRet,
        };
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
}

/**
 * Verify USDT transfer transaction
 */
export async function verifyUSDTTransfer(
    txID: string,
    expectedToAddress: string,
    expectedAmount?: number
): Promise<{
    valid: boolean;
    tx?: TokenTransfer;
    error?: string;
    confirmations: number;
    confirmed: boolean;
}> {
    if (!isValidTransactionHash(txID)) {
        return { valid: false, error: 'Invalid transaction hash format', confirmations: 0, confirmed: false };
    }

    try {
        // Get transaction info
        const txData = await fetchTronGrid(`/v1/transactions/${txID}/events`);

        if (!txData.data || txData.data.length === 0) {
            return { valid: false, error: 'Transaction not found or no events', confirmations: 0, confirmed: false };
        }

        // Look for Transfer event
        const transferEvent = txData.data.find((event: any) =>
            event.contract_address === USDT_CONTRACT &&
            event.event_name === 'Transfer'
        );

        if (!transferEvent) {
            return { valid: false, error: 'No USDT transfer found in transaction', confirmations: 0, confirmed: false };
        }

        const { result } = transferEvent;
        const toAddress = result.to;
        const amount = parseInt(result.value) / 1e6; // USDT has 6 decimals

        // Normalize addresses for comparison
        const normalizedExpectedAddress = expectedToAddress.toLowerCase();
        const normalizedTxToAddress = toAddress.toLowerCase();

        // Verify receiver address
        if (normalizedTxToAddress !== normalizedExpectedAddress) {
            return {
                valid: false,
                error: `Transaction sent to wrong address. Expected: ${expectedToAddress}, Got: ${toAddress}`,
                confirmations: 0,
                confirmed: false
            };
        }

        // Verify amount if provided
        if (expectedAmount !== undefined && Math.abs(amount - expectedAmount) > 0.01) {
            return {
                valid: false,
                error: `Amount mismatch. Expected: ${expectedAmount} USDT, Got: ${amount} USDT`,
                confirmations: 0,
                confirmed: false
            };
        }

        // Get confirmation details
        const txInfo = await getTransactionById(txID);

        return {
            valid: true,
            tx: {
                transaction_id: txID,
                block_ts: transferEvent.block_timestamp,
                from_address: result.from,
                to_address: toAddress,
                quant: result.value,
                token_info: {
                    symbol: 'USDT',
                    name: 'Tether USD',
                    decimals: 6,
                    address: USDT_CONTRACT,
                },
                confirmed: txInfo?.confirmed || false,
                riskTransaction: false,
            },
            confirmations: txInfo?.confirmations || 0,
            confirmed: txInfo?.confirmed || false,
        };
    } catch (error: any) {
        return {
            valid: false,
            error: error.message || 'Failed to verify transaction',
            confirmations: 0,
            confirmed: false
        };
    }
}

/**
 * Check if transaction has minimum confirmations
 */
export async function checkConfirmations(txID: string, minConfirmations: number = 19): Promise<{
    confirmed: boolean;
    confirmations: number;
    sufficient: boolean;
}> {
    try {
        const tx = await getTransactionById(txID);

        if (!tx) {
            return { confirmed: false, confirmations: 0, sufficient: false };
        }

        const sufficient = (tx.confirmations || 0) >= minConfirmations;

        return {
            confirmed: tx.confirmed,
            confirmations: tx.confirmations || 0,
            sufficient,
        };
    } catch (error) {
        return { confirmed: false, confirmations: 0, sufficient: false };
    }
}

// ==========================================
// Wallet Operations
// ==========================================

/**
 * Get wallet TRX balance
 */
export async function getTrxBalance(address: string): Promise<number> {
    if (!isValidTronAddress(address)) {
        throw new Error('Invalid TRON address');
    }

    try {
        const data = await fetchTronGrid(`/v1/accounts/${address}`);

        if (!data.data || data.data.length === 0) {
            return 0;
        }

        const account = data.data[0];
        return (account.balance || 0) / 1e6; // TRX has 6 decimals
    } catch (error) {
        console.error('Error fetching TRX balance:', error);
        return 0;
    }
}

/**
 * Get USDT balance
 */
export async function getUSDTBalance(address: string): Promise<number> {
    if (!isValidTronAddress(address)) {
        throw new Error('Invalid TRON address');
    }

    try {
        const data = await fetchTronGrid(`/v1/accounts/${address}/tokens`);

        if (!data.data) {
            return 0;
        }

        const usdtToken = data.data.find((token: any) =>
            token.tokenId === USDT_CONTRACT ||
            token.token_id === USDT_CONTRACT
        );

        if (!usdtToken) {
            return 0;
        }

        return (usdtToken.balance || 0) / 1e6; // USDT has 6 decimals
    } catch (error) {
        console.error('Error fetching USDT balance:', error);
        return 0;
    }
}

/**
 * Get all TRC-20 token balances
 */
export async function getAllTokenBalances(address: string): Promise<TokenBalance[]> {
    if (!isValidTronAddress(address)) {
        throw new Error('Invalid TRON address');
    }

    try {
        const data = await fetchTronGrid(`/v1/accounts/${address}/tokens`);

        if (!data.data) {
            return [];
        }

        return data.data.map((token: any) => ({
            symbol: token.symbol || 'UNKNOWN',
            name: token.name || 'Unknown Token',
            decimals: token.decimals || 6,
            balance: (token.balance || 0) / Math.pow(10, token.decimals || 6),
            contractAddress: token.tokenId || token.token_id || '',
        }));
    } catch (error) {
        console.error('Error fetching token balances:', error);
        return [];
    }
}

/**
 * Get complete wallet info
 */
export async function getWalletInfo(address: string): Promise<WalletBalance> {
    const [trxBalance, usdtBalance, tokens] = await Promise.all([
        getTrxBalance(address),
        getUSDTBalance(address),
        getAllTokenBalances(address),
    ]);

    return {
        address,
        trxBalance,
        usdtBalance,
        tokens,
    };
}

// ==========================================
// Transaction History
// ==========================================

/**
 * Get transaction history for an address
 */
export async function getTransactionHistory(
    address: string,
    options?: {
        limit?: number;
        onlyUSDT?: boolean;
        startTime?: number;
        endTime?: number;
    }
): Promise<TokenTransfer[]> {
    if (!isValidTronAddress(address)) {
        throw new Error('Invalid TRON address');
    }

    const limit = options?.limit || 20;

    try {
        let endpoint = `/v1/accounts/${address}/transactions/trc20?limit=${limit}&contract_address=${USDT_CONTRACT}`;

        if (options?.startTime) {
            endpoint += `&min_timestamp=${options.startTime}`;
        }
        if (options?.endTime) {
            endpoint += `&max_timestamp=${options.endTime}`;
        }

        const data = await fetchTronGrid(endpoint);

        if (!data.data) {
            return [];
        }

        return data.data.map((tx: any) => ({
            transaction_id: tx.transaction_id,
            block_ts: tx.block_ts,
            from_address: tx.from,
            to_address: tx.to,
            quant: tx.value,
            token_info: {
                symbol: tx.token_info?.symbol || 'USDT',
                name: tx.token_info?.name || 'Tether USD',
                decimals: tx.token_info?.decimals || 6,
                address: tx.token_info?.address || USDT_CONTRACT,
            },
            confirmed: tx.confirmed,
            riskTransaction: tx.riskTransaction || false,
        }));
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        return [];
    }
}

/**
 * Get incoming transactions (deposits) for an address
 */
export async function getIncomingTransactions(
    address: string,
    options?: { limit?: number; startTime?: number; endTime?: number }
): Promise<TokenTransfer[]> {
    const allTx = await getTransactionHistory(address, options);
    return allTx.filter(tx => tx.to_address.toLowerCase() === address.toLowerCase());
}

/**
 * Get outgoing transactions (withdrawals) for an address
 */
export async function getOutgoingTransactions(
    address: string,
    options?: { limit?: number; startTime?: number; endTime?: number }
): Promise<TokenTransfer[]> {
    const allTx = await getTransactionHistory(address, options);
    return allTx.filter(tx => tx.from_address.toLowerCase() === address.toLowerCase());
}

// ==========================================
// Fee Calculation
// ==========================================

/**
 * Calculate network fees for a transaction
 */
export async function calculateTransactionFee(
    fromAddress: string,
    toAddress: string,
    amount: number,
    token: 'TRX' | 'USDT' = 'USDT'
): Promise<TransactionFee> {
    try {
        // Get account resources
        const resources = await fetchTronGrid(`/v1/accounts/${fromAddress}/resources`);

        // Default fee estimates
        const bandwidthRequired = 250; // Average bandwidth for TRC-20 transfer
        const energyRequired = 65000;  // Average energy for USDT transfer

        const freeBandwidth = resources.freeNetLimit || 0;
        const totalBandwidth = (resources.NetLimit || 0) + freeBandwidth;
        const usedBandwidth = resources.NetUsed || 0;
        const availableBandwidth = totalBandwidth - usedBandwidth;

        const totalEnergy = resources.EnergyLimit || 0;
        const usedEnergy = resources.EnergyUsed || 0;
        const availableEnergy = totalEnergy - usedEnergy;

        // Calculate TRX needed if resources insufficient
        let estimatedTrxFee = 0;

        if (availableBandwidth < bandwidthRequired) {
            const bandwidthToBuy = bandwidthRequired - availableBandwidth;
            estimatedTrxFee += (bandwidthToBuy / 10); // 10 bandwidth = 1 TRX
        }

        if (availableEnergy < energyRequired) {
            const energyToBuy = energyRequired - availableEnergy;
            estimatedTrxFee += (energyToBuy / 420); // Approximate energy to TRX ratio
        }

        return {
            bandwidthRequired,
            energyRequired,
            estimatedTrxFee: Math.ceil(estimatedTrxFee * 100) / 100,
        };
    } catch (error) {
        // Return default estimates
        return {
            bandwidthRequired: 250,
            energyRequired: 65000,
            estimatedTrxFee: 15, // Safe estimate
        };
    }
}

// ==========================================
// Smart Contract Events
// ==========================================

/**
 * Get USDT Transfer events for a contract
 */
export async function getUSDTTransferEvents(
    options?: {
        fromBlock?: number;
        toBlock?: number;
        minBlockTimestamp?: number;
        maxBlockTimestamp?: number;
        limit?: number;
    }
): Promise<TokenTransfer[]> {
    try {
        let endpoint = `/v1/contracts/${USDT_CONTRACT}/events?event_name=Transfer&limit=${options?.limit || 20}`;

        if (options?.minBlockTimestamp) {
            endpoint += `&min_block_timestamp=${options.minBlockTimestamp}`;
        }
        if (options?.maxBlockTimestamp) {
            endpoint += `&max_block_timestamp=${options.maxBlockTimestamp}`;
        }

        const data = await fetchTronGrid(endpoint);

        if (!data.data) {
            return [];
        }

        return data.data.map((event: any) => ({
            transaction_id: event.transaction_id,
            block_ts: event.block_timestamp,
            from_address: event.result.from,
            to_address: event.result.to,
            quant: event.result.value,
            token_info: {
                symbol: 'USDT',
                name: 'Tether USD',
                decimals: 6,
                address: USDT_CONTRACT,
            },
            confirmed: event.confirmed,
            riskTransaction: false,
        }));
    } catch (error) {
        console.error('Error fetching USDT events:', error);
        return [];
    }
}

// ==========================================
// Double Spending Prevention (Firebase-Backed)
// ==========================================

const PROCESSED_TX_TABLE = 'processed_transactions';

interface ProcessedTransaction {
    id: string;
    tx_id: string;
    processed_at: string;
    user_id?: string;
    amount?: number;
    purpose?: string;
}

/**
 * Check if transaction has been processed before
 * Uses Firebase for persistence across server restarts
 */
export async function isTransactionProcessed(txID: string): Promise<boolean> {
    try {
        const normalizedTxId = txID.toLowerCase();
        const existing = await fetchRow<ProcessedTransaction>(PROCESSED_TX_TABLE, normalizedTxId);
        return existing !== null;
    } catch (error) {
        console.error('[TRON] Error checking processed transaction:', error);
        // Fail-safe: assume processed if we can't verify (prevents double-spend)
        return true;
    }
}

/**
 * Mark transaction as processed in Firebase
 */
export async function markTransactionProcessed(
    txID: string,
    metadata?: { user_id?: string; amount?: number; purpose?: string }
): Promise<void> {
    try {
        const normalizedTxId = txID.toLowerCase();
        await upsertRow<ProcessedTransaction>(PROCESSED_TX_TABLE, {
            id: normalizedTxId,
            tx_id: txID,
            processed_at: new Date().toISOString(),
            user_id: metadata?.user_id,
            amount: metadata?.amount,
            purpose: metadata?.purpose,
        });
    } catch (error) {
        console.error('[TRON] Error marking transaction as processed:', error);
        throw new Error('Failed to record transaction. Please try again.');
    }
}

/**
 * Verify transaction and check for double spending
 */
export async function verifyTransactionWithDoubleSpendCheck(
    txID: string,
    expectedToAddress: string,
    expectedAmount?: number
): Promise<{
    valid: boolean;
    alreadyProcessed: boolean;
    tx?: TokenTransfer;
    error?: string;
    confirmations: number;
    confirmed: boolean;
}> {
    // Check if already processed (Firebase-backed)
    const alreadyProcessed = await isTransactionProcessed(txID);
    if (alreadyProcessed) {
        return {
            valid: false,
            alreadyProcessed: true,
            error: 'This transaction has already been processed',
            confirmations: 0,
            confirmed: false,
        };
    }

    // Verify the transaction
    const result = await verifyUSDTTransfer(txID, expectedToAddress, expectedAmount);

    return {
        ...result,
        alreadyProcessed: false,
    };
}

// ==========================================
// Export Constants
// ==========================================

export { USDT_CONTRACT, TRONGRID_API_URL, TRONGRID_API_KEY };

// ==========================================
// Additional Utility Functions
// ==========================================

/**
 * Generate a TRON payment QR code URL
 * Uses a QR code generation service
 */
export function generatePaymentQRCodeURL(
    toAddress: string,
    amount: number,
    token: 'TRX' | 'USDT' = 'USDT'
): string {
    if (!isValidTronAddress(toAddress)) {
        throw new Error('Invalid TRON address');
    }

    // TRON link format for payments
    const tronLink = token === 'USDT'
        ? `tron://transfer?to=${toAddress}&amount=${amount}&token=USDT&contract=${USDT_CONTRACT}`
        : `tron://transfer?to=${toAddress}&amount=${amount}`;

    // Use a QR code generation service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tronLink)}`;
}

/**
 * Get account resources (bandwidth, energy)
 */
export async function getAccountResources(address: string): Promise<{
    freeNetLimit: number;
    freeNetUsed: number;
    netLimit: number;
    netUsed: number;
    energyLimit: number;
    energyUsed: number;
}> {
    if (!isValidTronAddress(address)) {
        throw new Error('Invalid TRON address');
    }

    try {
        const data = await fetchTronGrid(`/v1/accounts/${address}/resources`);

        return {
            freeNetLimit: data.freeNetLimit || 0,
            freeNetUsed: data.freeNetUsed || 0,
            netLimit: data.NetLimit || 0,
            netUsed: data.NetUsed || 0,
            energyLimit: data.EnergyLimit || 0,
            energyUsed: data.EnergyUsed || 0,
        };
    } catch (error) {
        console.error('Error fetching account resources:', error);
        return {
            freeNetLimit: 0,
            freeNetUsed: 0,
            netLimit: 0,
            netUsed: 0,
            energyLimit: 0,
            energyUsed: 0,
        };
    }
}

/**
 * Format TRON address for display
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address || address.length < startChars + endChars + 3) {
        return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format amount with proper decimals
 */
export function formatAmount(amount: number, decimals: number = 6): string {
    return (amount / Math.pow(10, decimals)).toFixed(decimals).replace(/\.?0+$/, '');
}

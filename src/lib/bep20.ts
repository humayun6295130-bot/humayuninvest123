"use client";

/**
 * BEP20 Blockchain Utilities for BNB Smart Chain
 * 
 * This module provides utilities for working with USDT on BNB Smart Chain (BEP20).
 * Replace all TRON/TRC20 references with these BEP20 functions.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from "@/firebase/config";

// ==========================================
// Constants
// ==========================================

// BEP20 USDT Contract on BNB Smart Chain
export const BEP20_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";

// Admin wallet for deposits
export const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || "0x";

// BSC RPC URL (public endpoint)
export const BSC_RPC_URL = process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed1.binance.org";

// BSCScan API for transaction verification
export const BSCSAN_API_URL = "https://api.bscscan.com/api";
export const BSCSAN_API_KEY = process.env.NEXT_PUBLIC_BSCSAN_API_KEY || "";

// ==========================================
// Types
// ==========================================

export interface BEP20Transaction {
    hash: string;
    blockNumber: number;
    timestamp: number;
    from: string;
    to: string;
    value: string;
    tokenId?: string;
    gasUsed: string;
    gasPrice: string;
    confirmations: number;
}

export interface WalletBalance {
    address: string;
    bnbBalance: number;
    usdtBalance: number;
    lastUpdated: number;
}

export interface TransactionFee {
    gasLimit: number;
    gasPrice: number;
    totalFee: number;
    unit: string;
}

export interface TokenTransfer {
    hash: string;
    blockNumber: number;
    timestamp: number;
    from: string;
    to: string;
    value: string;
    tokenSymbol: string;
    tokenDecimal: number;
    confirmations: number;
    isError: number;
}

// ==========================================
// Address Validation
// ==========================================

/**
 * Validates an Ethereum/BEP20 address format
 * BEP20 addresses start with 0x and are 42 characters long
 */
export function isValidBEP20Address(address: string): boolean {
    if (!address || typeof address !== 'string') return false;

    // Must be 42 characters: 0x + 40 hex characters
    if (address.length !== 42) return false;

    // Must start with 0x
    if (!address.startsWith('0x')) return false;

    // Must be valid hex (40 characters after 0x)
    const hexPart = address.slice(2);
    return /^[a-fA-F0-9]{40}$/.test(hexPart);
}

/**
 * Validates a transaction hash format (Ethereum-style)
 * Transaction hashes are 66 characters: 0x + 64 hex characters
 */
export function isValidTransactionHash(txHash: string): boolean {
    if (!txHash || typeof txHash !== 'string') return false;

    // Must be 66 characters
    if (txHash.length !== 66) return false;

    // Must start with 0x
    if (!txHash.startsWith('0x')) return false;

    // Must be valid hex
    const hexPart = txHash.slice(2);
    return /^[a-fA-F0-9]{64}$/.test(hexPart);
}

// ==========================================
// Blockchain Data Fetching
// ==========================================

/**
 * Fetches BNB balance for an address
 */
export async function getBNBBalance(address: string): Promise<number> {
    if (!isValidBEP20Address(address)) {
        throw new Error('Invalid BEP20 address');
    }

    try {
        const response = await fetch(
            `${BSCSAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        if (data.status === '1') {
            // Balance is returned in Wei (18 decimals), convert to BNB
            return parseFloat(data.result) / Math.pow(10, 18);
        }

        return 0;
    } catch (error) {
        console.error('Error fetching BNB balance:', error);
        return 0;
    }
}

/**
 * Fetches USDT (BEP20) balance for an address
 */
export async function getUSDTBalance(address: string): Promise<number> {
    if (!isValidBEP20Address(address)) {
        throw new Error('Invalid BEP20 address');
    }

    try {
        // Call balanceOf contract method
        const response = await fetch(
            `${BSCSAN_API_URL}?module=account&action=tokenbalance&contractaddress=${BEP20_USDT_CONTRACT}&address=${address}&tag=latest&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        if (data.status === '1') {
            // USDT has 18 decimals
            return parseFloat(data.result) / Math.pow(10, 18);
        }

        return 0;
    } catch (error) {
        console.error('Error fetching USDT balance:', error);
        return 0;
    }
}

/**
 * Gets complete wallet info including BNB and USDT balances
 */
export async function getWalletInfo(address: string): Promise<WalletBalance> {
    const [bnbBalance, usdtBalance] = await Promise.all([
        getBNBBalance(address),
        getUSDTBalance(address),
    ]);

    return {
        address,
        bnbBalance,
        usdtBalance,
        lastUpdated: Date.now(),
    };
}

/**
 * Gets all BEP20 token balances for an address
 */
export async function getAllTokenBalances(address: string): Promise<{ symbol: string; balance: number }[]> {
    if (!isValidBEP20Address(address)) {
        throw new Error('Invalid BEP20 address');
    }

    try {
        const response = await fetch(
            `${BSCSAN_API_URL}?module=account&action=tokenbalance&address=${address}&page=1&offset=100&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
            return data.result.map((token: any) => ({
                symbol: token.tokenSymbol || 'Unknown',
                balance: parseFloat(token.balance) / Math.pow(10, parseInt(token.tokenDecimal) || 18),
            }));
        }

        return [];
    } catch (error) {
        console.error('Error fetching token balances:', error);
        return [];
    }
}

// ==========================================
// Transaction Operations
// ==========================================

/**
 * Fetches transaction details by hash
 */
export async function getTransactionById(txHash: string): Promise<BEP20Transaction | null> {
    if (!isValidTransactionHash(txHash)) {
        return null;
    }

    try {
        const response = await fetch(
            `${BSCSAN_API_URL}?module=transaction&action=gettxinfo&txhash=${txHash}&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        if (data.status === '1' && data.result) {
            const tx = data.result;
            return {
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: parseInt(tx.timeStamp) * 1000,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                gasUsed: tx.gasUsed,
                gasPrice: tx.gasPrice,
                confirmations: parseInt(tx.confirmations) || 0,
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
}

/**
 * Verifies a USDT transfer transaction
 */
export async function verifyUSDTTransfer(
    txHash: string,
    expectedToAddress?: string,
    expectedAmount?: number
): Promise<{
    valid: boolean;
    error?: string;
    tx?: TokenTransfer;
}> {
    try {
        // First get the transaction details
        const response = await fetch(
            `${BSCSAN_API_URL}?module=account&action=tokentx&contractaddress=${BEP20_USDT_CONTRACT}&txhash=${txHash}&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        if (data.status !== '1' || !data.result || data.result.length === 0) {
            return {
                valid: false,
                error: 'Transaction not found or not a USDT transfer',
            };
        }

        const tx = data.result[0];

        // Check if it's to our admin wallet (for deposits)
        if (expectedToAddress && tx.to.toLowerCase() !== expectedToAddress.toLowerCase()) {
            return {
                valid: false,
                error: `Transaction recipient doesn't match expected address`,
            };
        }

        // Check amount if specified
        if (expectedAmount !== undefined) {
            const txAmount = parseFloat(tx.value) / Math.pow(10, 18);
            if (txAmount < expectedAmount) {
                return {
                    valid: false,
                    error: `Transaction amount (${txAmount}) is less than expected (${expectedAmount})`,
                };
            }
        }

        // Check confirmations (require at least 15 for BEP20)
        const confirmations = parseInt(tx.confirmations) || 0;
        if (confirmations < 15) {
            return {
                valid: false,
                error: `Insufficient confirmations: ${confirmations}/15`,
            };
        }

        return {
            valid: true,
            tx: {
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: parseInt(tx.timeStamp) * 1000,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                tokenSymbol: 'USDT',
                tokenDecimal: 18,
                confirmations,
                isError: 0,
            },
        };
    } catch (error: any) {
        return {
            valid: false,
            error: error.message || 'Verification failed',
        };
    }
}

/**
 * Checks transaction confirmations
 */
export async function checkConfirmations(txHash: string, minConfirmations: number = 15): Promise<{
    confirmed: boolean;
    confirmations: number;
    sufficient: boolean;
}> {
    try {
        const response = await fetch(
            `${BSCSAN_API_URL}?module=transaction&action=gettxinfo&txhash=${txHash}&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        if (data.status === '1' && data.result) {
            const confirmations = parseInt(data.result.confirmations) || 0;
            return {
                confirmed: confirmations >= 1,
                confirmations,
                sufficient: confirmations >= minConfirmations,
            };
        }

        return { confirmed: false, confirmations: 0, sufficient: false };
    } catch (error) {
        return { confirmed: false, confirmations: 0, sufficient: false };
    }
}

// ==========================================
// Transaction History
// ==========================================

/**
 * Gets transaction history for an address
 */
export async function getTransactionHistory(
    address: string,
    options?: {
        page?: number;
        offset?: number;
        startBlock?: number;
        endBlock?: number;
    }
): Promise<BEP20Transaction[]> {
    if (!isValidBEP20Address(address)) {
        throw new Error('Invalid BEP20 address');
    }

    try {
        const page = options?.page || 1;
        const offset = options?.offset || 20;

        // Get both normal transactions and token transfers
        const [normalResponse, tokenResponse] = await Promise.all([
            fetch(
                `${BSCSAN_API_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc&apikey=${BSCSAN_API_KEY}`
            ),
            fetch(
                `${BSCSAN_API_URL}?module=account&action=tokentx&contractaddress=${BEP20_USDT_CONTRACT}&address=${address}&page=${page}&offset=${offset}&sort=desc&apikey=${BSCSAN_API_KEY}`
            ),
        ]);

        const normalData = await normalResponse.json();
        const tokenData = await tokenResponse.json();

        const transactions: BEP20Transaction[] = [];

        // Add normal BNB transactions
        if (normalData.status === '1' && Array.isArray(normalData.result)) {
            normalData.result.forEach((tx: any) => {
                transactions.push({
                    hash: tx.hash,
                    blockNumber: parseInt(tx.blockNumber),
                    timestamp: parseInt(tx.timeStamp) * 1000,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    gasUsed: tx.gasUsed,
                    gasPrice: tx.gasPrice,
                    confirmations: parseInt(tx.confirmations) || 0,
                });
            });
        }

        // Add USDT token transfers
        if (tokenData.status === '1' && Array.isArray(tokenData.result)) {
            tokenData.result.forEach((tx: any) => {
                transactions.push({
                    hash: tx.hash,
                    blockNumber: parseInt(tx.blockNumber),
                    timestamp: parseInt(tx.timeStamp) * 1000,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    gasUsed: tx.gasUsed,
                    gasPrice: tx.gasPrice,
                    confirmations: parseInt(tx.confirmations) || 0,
                });
            });
        }

        // Sort by timestamp descending
        transactions.sort((a, b) => b.timestamp - a.timestamp);

        return transactions.slice(0, offset);
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        return [];
    }
}

/**
 * Gets only incoming transactions
 */
export async function getIncomingTransactions(
    address: string,
    limit: number = 20
): Promise<BEP20Transaction[]> {
    const history = await getTransactionHistory(address, { offset: limit });
    return history.filter(tx => tx.to.toLowerCase() === address.toLowerCase());
}

/**
 * Gets only outgoing transactions
 */
export async function getOutgoingTransactions(
    address: string,
    limit: number = 20
): Promise<BEP20Transaction[]> {
    const history = await getTransactionHistory(address, { offset: limit });
    return history.filter(tx => tx.from.toLowerCase() === address.toLowerCase());
}

// ==========================================
// Fee Calculation
// ==========================================

/**
 * Calculates transaction fee for BEP20 transfer
 */
export async function calculateTransactionFee(
    fromAddress: string,
    toAddress: string,
    amount: number
): Promise<TransactionFee> {
    // BEP20 transfer gas limit is typically 21000 for standard transfer
    const gasLimit = 65000; // Safe upper limit for BEP20 token transfers

    try {
        // Get current gas price from API
        const response = await fetch(
            `${BSCSAN_API_URL}?module=proxy&action=eth_gasPrice&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        // Gas price in Wei (convert to Gwei for display)
        const gasPriceWei = parseInt(data.result || '5000000000');
        const gasPriceGwei = gasPriceWei / Math.pow(10, 9);

        // Calculate total fee in BNB
        const totalFeeBNB = (gasLimit * gasPriceWei) / Math.pow(10, 18);

        return {
            gasLimit,
            gasPrice: Math.round(gasPriceGwei * 100) / 100,
            totalFee: Math.round(totalFeeBNB * 10000) / 10000,
            unit: 'BNB',
        };
    } catch (error) {
        // Return default estimates if API fails
        return {
            gasLimit,
            gasPrice: 5, // Default 5 Gwei
            totalFee: 0.000325, // ~$0.20 at current BNB price
            unit: 'BNB',
        };
    }
}

// ==========================================
// Transaction Status
// ==========================================

/**
 * Checks if a transaction has been processed
 */
export async function isTransactionProcessed(txHash: string): Promise<boolean> {
    try {
        const response = await fetch(
            `${BSCSAN_API_URL}?module=transaction&action=gettxinfo&txhash=${txHash}&apikey=${BSCSAN_API_KEY}`
        );
        const data = await response.json();

        return data.status === '1' && data.result && parseInt(data.result.blockNumber) > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Verifies transaction with double-spend protection
 * (Checks if transaction is already processed in our system)
 */
export async function verifyTransactionWithDoubleSpendCheck(
    txHash: string,
    expectedToAddress?: string,
    expectedAmount?: number
): Promise<{
    valid: boolean;
    alreadyProcessed: boolean;
    error?: string;
    tx?: TokenTransfer;
    confirmations: number;
    confirmed: boolean;
}> {
    // First check if already processed in our database
    if (!db) {
        // If db is not available, just verify on blockchain
        const verification = await verifyUSDTTransfer(txHash, expectedToAddress, expectedAmount);
        const confirmationsCheck = await checkConfirmations(txHash, 15);

        return {
            valid: verification.valid,
            alreadyProcessed: false,
            error: verification.error,
            tx: verification.tx,
            confirmations: confirmationsCheck.confirmations,
            confirmed: confirmationsCheck.confirmed,
        };
    }

    const processedRef = doc(db, 'processed_transactions', txHash);
    const processedDoc = await getDoc(processedRef);

    if (processedDoc.exists()) {
        return {
            valid: false,
            alreadyProcessed: true,
            error: 'Transaction already processed',
            confirmations: 0,
            confirmed: false,
        };
    }

    // Verify on blockchain
    const verification = await verifyUSDTTransfer(txHash, expectedToAddress, expectedAmount);
    const confirmationsCheck = await checkConfirmations(txHash, 15);

    return {
        valid: verification.valid,
        alreadyProcessed: false,
        error: verification.error,
        tx: verification.tx,
        confirmations: confirmationsCheck.confirmations,
        confirmed: confirmationsCheck.confirmed,
    };
}

// ==========================================
// QR Code Generation
// ==========================================

/**
 * Generates QR code URL for BEP20 address
 */
export function generatePaymentQRCodeURL(toAddress: string): string {
    if (!isValidBEP20Address(toAddress)) {
        throw new Error('Invalid BEP20 address');
    }

    // Using a simple QR code API
    const encodedAddress = encodeURIComponent(toAddress);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedAddress}`;
}

// ==========================================
// Utilities
// ==========================================

/**
 * Formats address for display (truncates middle)
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address || address.length < startChars + endChars + 3) {
        return address;
    }

    return `${address.slice(0, startChars + 2)}...${address.slice(-endChars)}`;
}

/**
 * Formats amount with specified decimals
 */
export function formatAmount(amount: number, decimals: number = 6): string {
    return (amount / Math.pow(10, decimals)).toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Gets network name for display
 */
export function getNetworkName(): string {
    return 'BEP20 (BNB Smart Chain)';
}

/**
 * Gets wallet info for display
 */
export function getWalletInfoDisplay(): {
    network: string;
    currency: string;
    symbol: string;
    explorer: string;
} {
    return {
        network: 'BNB Smart Chain',
        currency: 'USDT',
        symbol: '₮',
        explorer: 'https://bscscan.com',
    };
}
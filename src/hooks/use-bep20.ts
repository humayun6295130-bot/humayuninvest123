"use client";

/**
 * React Hooks for BEP20/BNB Smart Chain Blockchain Operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    isValidBEP20Address,
    isValidTransactionHash,
    verifyUSDTTransfer,
    checkConfirmations,
    getWalletInfo,
    getTransactionHistory,
    getIncomingTransactions,
    getOutgoingTransactions,
    calculateTransactionFee,
    verifyTransactionWithDoubleSpendCheck,
    TokenTransfer,
    WalletBalance,
    TransactionFee,
    ADMIN_WALLET_ADDRESS,
} from '@/lib/bep20';

// ==========================================
// Transaction Verification Hook
// ==========================================

interface UseTransactionVerificationOptions {
    expectedToAddress?: string;
    expectedAmount?: number;
    minConfirmations?: number;
    autoVerify?: boolean;
}

interface UseTransactionVerificationReturn {
    verify: (txID: string) => Promise<void>;
    isVerifying: boolean;
    result: {
        valid: boolean;
        error?: string;
        tx?: TokenTransfer;
        confirmations: number;
        confirmed: boolean;
        sufficientConfirmations: boolean;
    } | null;
    reset: () => void;
}

export function useTransactionVerification(
    options: UseTransactionVerificationOptions = {}
): UseTransactionVerificationReturn {
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<UseTransactionVerificationReturn['result']>(null);

    const verify = useCallback(async (txID: string) => {
        setIsVerifying(true);

        try {
            const expectedToAddress = options.expectedToAddress || ADMIN_WALLET_ADDRESS;
            const minConfirmations = options.minConfirmations || 15;

            const verification = await verifyUSDTTransfer(
                txID,
                expectedToAddress,
                options.expectedAmount
            );

            const confirmationCheck = await checkConfirmations(txID, minConfirmations);

            setResult({
                valid: verification.valid,
                error: verification.error,
                tx: verification.tx,
                confirmations: confirmationCheck.confirmations,
                confirmed: confirmationCheck.confirmed,
                sufficientConfirmations: confirmationCheck.sufficient,
            });
        } catch (error: any) {
            setResult({
                valid: false,
                error: error.message || 'Verification failed',
                confirmations: 0,
                confirmed: false,
                sufficientConfirmations: false,
            });
        } finally {
            setIsVerifying(false);
        }
    }, [options.expectedToAddress, options.expectedAmount, options.minConfirmations]);

    const reset = useCallback(() => {
        setResult(null);
    }, []);

    return { verify, isVerifying, result, reset };
}

// ==========================================
// Double Spend Check Hook
// ==========================================

interface UseDoubleSpendCheckReturn {
    verify: (txID: string) => Promise<void>;
    isVerifying: boolean;
    result: {
        valid: boolean;
        alreadyProcessed: boolean;
        error?: string;
        tx?: TokenTransfer;
        confirmations: number;
        confirmed: boolean;
    } | null;
    reset: () => void;
}

export function useDoubleSpendCheck(
    expectedToAddress?: string,
    expectedAmount?: number
): UseDoubleSpendCheckReturn {
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<UseDoubleSpendCheckReturn['result']>(null);

    const verify = useCallback(async (txID: string) => {
        setIsVerifying(true);

        try {
            const toAddress = expectedToAddress || ADMIN_WALLET_ADDRESS;
            const verification = await verifyTransactionWithDoubleSpendCheck(
                txID,
                toAddress,
                expectedAmount
            );

            setResult({
                valid: verification.valid,
                alreadyProcessed: verification.alreadyProcessed,
                error: verification.error,
                tx: verification.tx,
                confirmations: verification.confirmations,
                confirmed: verification.confirmed,
            });
        } catch (error: any) {
            setResult({
                valid: false,
                alreadyProcessed: false,
                error: error.message || 'Verification failed',
                confirmations: 0,
                confirmed: false,
            });
        } finally {
            setIsVerifying(false);
        }
    }, [expectedToAddress, expectedAmount]);

    const reset = useCallback(() => {
        setResult(null);
    }, []);

    return { verify, isVerifying, result, reset };
}

// ==========================================
// Wallet Balance Hook
// ==========================================

interface UseWalletBalanceOptions {
    refreshInterval?: number; // in milliseconds
    autoRefresh?: boolean;
}

interface UseWalletBalanceReturn {
    balance: WalletBalance | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useWalletBalance(
    address: string,
    options: UseWalletBalanceOptions = {}
): UseWalletBalanceReturn {
    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!address || !isValidBEP20Address(address)) {
            setError('Invalid BEP20 address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const walletInfo = await getWalletInfo(address);
            setBalance(walletInfo);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch balance');
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    useEffect(() => {
        refresh();

        if (options.autoRefresh && options.refreshInterval) {
            const interval = setInterval(refresh, options.refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refresh, options.autoRefresh, options.refreshInterval]);

    return { balance, isLoading, error, refresh };
}

// ==========================================
// Transaction History Hook
// ==========================================

interface UseTransactionHistoryOptions {
    limit?: number;
    page?: number;
}

interface UseTransactionHistoryReturn {
    transactions: any[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useTransactionHistory(
    address: string,
    options: UseTransactionHistoryOptions = {}
): UseTransactionHistoryReturn {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(options.page || 1);
    const [hasMore, setHasMore] = useState(true);

    const limit = options.limit || 20;

    const fetchTransactions = useCallback(async (pageNum: number, append = false) => {
        if (!address || !isValidBEP20Address(address)) {
            setError('Invalid BEP20 address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const history = await getTransactionHistory(address, {
                page: pageNum,
                offset: limit,
            });

            if (append) {
                setTransactions(prev => [...prev, ...history]);
            } else {
                setTransactions(history);
            }

            setHasMore(history.length === limit);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch transactions');
        } finally {
            setIsLoading(false);
        }
    }, [address, limit]);

    useEffect(() => {
        fetchTransactions(1, false);
    }, [address]);

    const loadMore = useCallback(async () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            await fetchTransactions(nextPage, true);
        }
    }, [isLoading, hasMore, page, fetchTransactions]);

    const refresh = useCallback(async () => {
        setPage(1);
        await fetchTransactions(1, false);
    }, [fetchTransactions]);

    return { transactions, isLoading, error, hasMore, loadMore, refresh };
}

// ==========================================
// Address Validator Hook
// ==========================================

interface UseAddressValidatorReturn {
    isValid: boolean;
    isValidating: boolean;
    validate: (address: string) => Promise<boolean>;
    reset: () => void;
}

export function useAddressValidator(): UseAddressValidatorReturn {
    const [isValid, setIsValid] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const validate = useCallback(async (address: string): Promise<boolean> => {
        setIsValidating(true);

        try {
            // Basic format validation
            const valid = isValidBEP20Address(address);
            setIsValid(valid);
            return valid;
        } finally {
            setIsValidating(false);
        }
    }, []);

    const reset = useCallback(() => {
        setIsValid(false);
        setIsValidating(false);
    }, []);

    return { isValid, isValidating, validate, reset };
}

// ==========================================
// Fee Calculator Hook
// ==========================================

interface UseFeeCalculatorReturn {
    fee: TransactionFee | null;
    isCalculating: boolean;
    calculate: (fromAddress: string, toAddress: string, amount: number) => Promise<void>;
    reset: () => void;
}

export function useFeeCalculator(): UseFeeCalculatorReturn {
    const [fee, setFee] = useState<TransactionFee | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const calculate = useCallback(async (fromAddress: string, toAddress: string, amount: number) => {
        if (!isValidBEP20Address(fromAddress) || !isValidBEP20Address(toAddress)) {
            return;
        }

        setIsCalculating(true);

        try {
            const feeData = await calculateTransactionFee(fromAddress, toAddress, amount);
            setFee(feeData);
        } catch (error) {
            console.error('Failed to calculate fee:', error);
            setFee(null);
        } finally {
            setIsCalculating(false);
        }
    }, []);

    const reset = useCallback(() => {
        setFee(null);
        setIsCalculating(false);
    }, []);

    return { fee, isCalculating, calculate, reset };
}

// ==========================================
// QR Code Generator Hook
// ==========================================

interface UseQRCodeReturn {
    qrCodeUrl: string | null;
    generate: (address: string) => void;
    error: string | null;
}

export function useQRCode(): UseQRCodeReturn {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generate = useCallback((address: string) => {
        if (!isValidBEP20Address(address)) {
            setError('Invalid BEP20 address');
            setQrCodeUrl(null);
            return;
        }

        setError(null);

        // Using QR Server API to generate QR code
        const encodedAddress = encodeURIComponent(address);
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedAddress}`;
        setQrCodeUrl(url);
    }, []);

    return { qrCodeUrl, generate, error };
}

// ==========================================
// Network Info Hook
// ==========================================

interface UseNetworkInfoReturn {
    network: string;
    currency: string;
    symbol: string;
    explorer: string;
    isValidAddress: (address: string) => boolean;
}

export function useNetworkInfo(): UseNetworkInfoReturn {
    return {
        network: 'BNB Smart Chain',
        currency: 'USDT',
        symbol: '₮',
        explorer: 'https://bscscan.com',
        isValidAddress: isValidBEP20Address,
    };
}

// ==========================================
// Confirmation Tracker Hook
// ==========================================

interface UseConfirmationTrackerOptions {
    minConfirmations?: number;
    pollInterval?: number;
    onConfirmed?: () => void;
}

interface UseConfirmationTrackerReturn {
    confirmations: number;
    confirmed: boolean;
    sufficient: boolean;
    isChecking: boolean;
    error: string | null;
    startTracking: (txID: string) => void;
    stopTracking: () => void;
}

export function useConfirmationTracker(
    options: UseConfirmationTrackerOptions = {}
): UseConfirmationTrackerReturn {
    const [confirmations, setConfirmations] = useState(0);
    const [confirmed, setConfirmed] = useState(false);
    const [sufficient, setSufficient] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startTracking = useCallback((txID: string) => {
        if (!isValidTransactionHash(txID)) {
            setError('Invalid transaction hash');
            return;
        }

        setIsChecking(true);
        setError(null);

        const minConfirmations = options.minConfirmations || 15;
        const pollInterval = options.pollInterval || 30000; // 30 seconds

        const check = async () => {
            try {
                const result = await checkConfirmations(txID, minConfirmations);
                setConfirmations(result.confirmations);
                setConfirmed(result.confirmed);
                setSufficient(result.sufficient);

                if (result.sufficient && options.onConfirmed) {
                    options.onConfirmed();
                    stopTracking();
                }
            } catch (err: any) {
                setError(err.message || 'Failed to check confirmations');
            }
        };

        check(); // Initial check
        intervalRef.current = setInterval(check, pollInterval);
    }, [options.minConfirmations, options.pollInterval, options.onConfirmed]);

    const stopTracking = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsChecking(false);
    }, []);

    useEffect(() => {
        return () => stopTracking();
    }, [stopTracking]);

    return {
        confirmations,
        confirmed,
        sufficient,
        isChecking,
        error,
        startTracking,
        stopTracking,
    };
}
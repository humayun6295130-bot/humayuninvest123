"use client";

/**
 * React Hooks for TRON Blockchain Operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    isValidTronAddress,
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
} from '@/lib/tron';

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
            const minConfirmations = options.minConfirmations || 19;

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
        if (!address || !isValidTronAddress(address)) {
            setError('Invalid TRON address');
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
    startTime?: number;
    endTime?: number;
    type?: 'all' | 'incoming' | 'outgoing';
}

interface UseTransactionHistoryReturn {
    transactions: TokenTransfer[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    hasMore: boolean;
    loadMore: () => Promise<void>;
}

export function useTransactionHistory(
    address: string,
    options: UseTransactionHistoryOptions = {}
): UseTransactionHistoryReturn {
    const [transactions, setTransactions] = useState<TokenTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(0);

    const fetchTransactions = useCallback(async (append = false) => {
        if (!address || !isValidTronAddress(address)) {
            setError('Invalid TRON address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const limit = options.limit || 20;
            const type = options.type || 'all';

            let txList: TokenTransfer[];

            if (type === 'incoming') {
                txList = await getIncomingTransactions(address, {
                    limit,
                    startTime: options.startTime,
                    endTime: options.endTime,
                });
            } else if (type === 'outgoing') {
                txList = await getOutgoingTransactions(address, {
                    limit,
                    startTime: options.startTime,
                    endTime: options.endTime,
                });
            } else {
                txList = await getTransactionHistory(address, {
                    limit,
                    startTime: options.startTime,
                    endTime: options.endTime,
                });
            }

            if (append) {
                setTransactions(prev => [...prev, ...txList]);
            } else {
                setTransactions(txList);
            }

            setHasMore(txList.length === limit);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch transactions');
        } finally {
            setIsLoading(false);
        }
    }, [address, options.limit, options.startTime, options.endTime, options.type]);

    const refresh = useCallback(async () => {
        pageRef.current = 0;
        await fetchTransactions(false);
    }, [fetchTransactions]);

    const loadMore = useCallback(async () => {
        pageRef.current += 1;
        await fetchTransactions(true);
    }, [fetchTransactions]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { transactions, isLoading, error, refresh, hasMore, loadMore };
}

// ==========================================
// Fee Calculator Hook
// ==========================================

interface UseFeeCalculatorReturn {
    fee: TransactionFee | null;
    isCalculating: boolean;
    error: string | null;
    calculate: (fromAddress: string, toAddress: string, amount: number) => Promise<void>;
}

export function useFeeCalculator(): UseFeeCalculatorReturn {
    const [fee, setFee] = useState<TransactionFee | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculate = useCallback(async (
        fromAddress: string,
        toAddress: string,
        amount: number
    ) => {
        if (!isValidTronAddress(fromAddress)) {
            setError('Invalid sender address');
            return;
        }

        if (!isValidTronAddress(toAddress)) {
            setError('Invalid recipient address');
            return;
        }

        setIsCalculating(true);
        setError(null);

        try {
            const feeEstimate = await calculateTransactionFee(fromAddress, toAddress, amount);
            setFee(feeEstimate);
        } catch (err: any) {
            setError(err.message || 'Failed to calculate fee');
        } finally {
            setIsCalculating(false);
        }
    }, []);

    return { fee, isCalculating, error, calculate };
}

// ==========================================
// Address Validator Hook
// ==========================================

interface UseAddressValidatorReturn {
    isValid: boolean | null;
    isValidating: boolean;
    validate: (address: string) => Promise<void>;
    reset: () => void;
}

export function useAddressValidator(): UseAddressValidatorReturn {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const validate = useCallback(async (address: string) => {
        setIsValidating(true);

        // Simulate API validation delay
        await new Promise(resolve => setTimeout(resolve, 300));

        setIsValid(isValidTronAddress(address));
        setIsValidating(false);
    }, []);

    const reset = useCallback(() => {
        setIsValid(null);
    }, []);

    return { isValid, isValidating, validate, reset };
}

// ==========================================
// Confirmation Tracker Hook
// ==========================================

interface UseConfirmationTrackerOptions {
    pollInterval?: number; // in milliseconds
    minConfirmations?: number;
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

        const minConfirmations = options.minConfirmations || 19;
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

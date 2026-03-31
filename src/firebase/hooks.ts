'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    User
} from 'firebase/auth';
import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    QueryConstraint,
    getDoc,
    getDocs
} from 'firebase/firestore';
import { auth, db } from './config';
import { useFirebaseContext } from './provider';

// ─── Core Hooks ───────────────────────────────────────

export function useFirebase() {
    const { isConfigured } = useFirebaseContext();
    return { auth, db, isConfigured };
}

export function useUser(): {
    user: User | null;
    isUserLoading: boolean;
    userProfile: any | null;
    isProfileLoading: boolean
} {
    const { user, isLoading, userProfile, isProfileLoading } = useFirebaseContext();
    return { user, isUserLoading: isLoading, userProfile, isProfileLoading };
}

export function useAuth() {
    const { isConfigured } = useFirebaseContext();

    if (!isConfigured || !auth) {
        return {
            signIn: async () => { throw new Error('Firebase not configured'); },
            signUp: async () => { throw new Error('Firebase not configured'); },
            signOut: async () => { throw new Error('Firebase not configured'); },
        };
    }

    return {
        signIn: (email: string, password: string) =>
            signInWithEmailAndPassword(auth!, email, password),
        signUp: (email: string, password: string) =>
            createUserWithEmailAndPassword(auth!, email, password),
        signOut: () => firebaseSignOut(auth!),
    };
}

// Helper function for signOut
async function firebaseSignOut(auth: any) {
    return signOut(auth);
}

// ─── Optimized Dashboard Data Hook ─────────────────────

interface DashboardData {
    portfolio: any | null;
    assets: any[];
    transactions: any[];
}

interface UseDashboardDataResult {
    data: DashboardData;
    isLoading: boolean;
    error: Error | null;
}

export function useDashboardData(userId: string | undefined): UseDashboardDataResult {
    const [data, setData] = useState<DashboardData>({
        portfolio: null,
        assets: [],
        transactions: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const dataCache = useRef<DashboardData | null>(null);
    const unsubscribers = useRef<(() => void)[]>([]);

    useEffect(() => {
        // Clear previous unsubscribers
        unsubscribers.current.forEach(unsub => unsub());
        unsubscribers.current = [];

        if (!userId || !db) {
            setData({ portfolio: null, assets: [], transactions: [] });
            setIsLoading(false);
            return;
        }

        // Use cached data immediately if available (stale-while-revalidate)
        if (dataCache.current) {
            setData(dataCache.current);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        setError(null);

        const firestoreDb = db; // Type guard - we know db is not null here

        // Parallel data fetching for faster initial load
        const fetchAllData = async () => {
            try {
                // Fetch portfolio and transactions in parallel
                const portfolioQuery = query(
                    collection(firestoreDb, 'portfolios'),
                    where('user_id', '==' as const, userId),
                    limit(1)
                );
                const transactionsQuery = query(
                    collection(firestoreDb, 'transactions'),
                    where('user_id', '==' as const, userId),
                    orderBy('created_at', 'desc'),
                    limit(3)
                );

                const [portfolioSnapshot, transactionsSnapshot] = await Promise.all([
                    getDocs(portfolioQuery),
                    getDocs(transactionsQuery)
                ]);

                const portfolio = portfolioSnapshot.docs[0]
                    ? { ...portfolioSnapshot.docs[0].data(), id: portfolioSnapshot.docs[0].id }
                    : null;

                const transactions = transactionsSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                }));

                // Fetch assets if portfolio exists
                let assets: any[] = [];
                if (portfolio) {
                    const assetsQuery = query(
                        collection(firestoreDb, 'assets'),
                        where('portfolio_id', '==' as const, portfolio.id)
                    );
                    const assetsSnapshot = await getDocs(assetsQuery);
                    assets = assetsSnapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id
                    }));
                }

                const newData = { portfolio, assets, transactions };
                dataCache.current = newData;
                setData(newData);
                setIsLoading(false);

                // Set up real-time listeners after initial fetch
                setupRealtimeListeners(firestoreDb, userId, portfolio?.id);

            } catch (err: any) {
                console.error('Error fetching dashboard data:', err);
                setError(err);
                setIsLoading(false);
            }
        };

        const setupRealtimeListeners = (firestoreDb: any, uid: string, portfolioId?: string) => {
            // Portfolio listener
            const portfolioQuery = query(
                collection(firestoreDb, 'portfolios'),
                where('user_id', '==' as const, uid),
                limit(1)
            );

            const portfolioUnsub = onSnapshot(portfolioQuery, (snapshot: any) => {
                const portfolio = snapshot.docs[0]
                    ? { ...snapshot.docs[0].data(), id: snapshot.docs[0].id }
                    : null;

                setData(prev => {
                    const updated = { ...prev, portfolio };
                    dataCache.current = updated;
                    return updated;
                });
            });
            unsubscribers.current.push(portfolioUnsub);

            // Assets listener (if portfolio exists)
            if (portfolioId) {
                const assetsQuery = query(
                    collection(firestoreDb, 'assets'),
                    where('portfolio_id', '==' as const, portfolioId)
                );
                const assetsUnsub = onSnapshot(assetsQuery, (snapshot: any) => {
                    const assets = snapshot.docs.map((doc: any) => ({
                        ...doc.data(),
                        id: doc.id
                    }));
                    setData(prev => {
                        const updated = { ...prev, assets };
                        dataCache.current = updated;
                        return updated;
                    });
                });
                unsubscribers.current.push(assetsUnsub);
            }

            // Transactions listener
            const transactionsQuery = query(
                collection(firestoreDb, 'transactions'),
                where('user_id', '==' as const, uid),
                orderBy('created_at', 'desc'),
                limit(3)
            );
            const transactionsUnsub = onSnapshot(transactionsQuery, (snapshot: any) => {
                const transactions = snapshot.docs.map((doc: any) => ({
                    ...doc.data(),
                    id: doc.id
                }));
                setData(prev => {
                    const updated = { ...prev, transactions };
                    dataCache.current = updated;
                    return updated;
                });
            });
            unsubscribers.current.push(transactionsUnsub);
        };

        fetchAllData();

        return () => {
            unsubscribers.current.forEach(unsub => unsub());
            unsubscribers.current = [];
        };
    }, [userId]);

    return { data, isLoading, error };
}

// ─── Real-time Collection Hook ─────────────────────────

interface UseRealtimeCollectionOptions {
    table: string;
    filters?: { column: string; operator: string; value: any }[];
    orderByColumn?: { column: string; direction?: 'asc' | 'desc' };
    limitCount?: number;
    enabled?: boolean;
}

interface UseRealtimeCollectionResult<T> {
    data: T[] | null;
    isLoading: boolean;
    error: Error | null;
}

export function useRealtimeCollection<T = any>(
    options: UseRealtimeCollectionOptions
): UseRealtimeCollectionResult<T> {
    const [data, setData] = useState<T[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const hasInitialData = useRef(false);

    // Create a stable key for the options to prevent infinite re-renders
    const optionsKey = useMemo(() => {
        return `${options.table}-${options.enabled}-${options.limitCount}-${JSON.stringify(options.filters || [])}-${JSON.stringify(options.orderByColumn || {})}`;
    }, [options.table, options.enabled, options.limitCount, options.filters, options.orderByColumn]);

    useEffect(() => {
        if (options.enabled === false) {
            setData(null);
            setIsLoading(false);
            setError(null);
            hasInitialData.current = false;
            return;
        }

        if (!db) {
            setError(new Error('Firebase not configured'));
            setIsLoading(false);
            return;
        }

        // Only show loading if we don't have data yet
        if (!hasInitialData.current) {
            setIsLoading(true);
        }
        setError(null);

        // Build query constraints
        const constraints: QueryConstraint[] = [];

        if (options.filters) {
            for (const filter of options.filters) {
                constraints.push(where(filter.column, filter.operator as any, filter.value));
            }
        }

        if (options.orderByColumn) {
            constraints.push(orderBy(options.orderByColumn.column, options.orderByColumn.direction || 'asc'));
        }

        if (options.limitCount) {
            constraints.push(limit(options.limitCount));
        }

        const q = constraints.length > 0
            ? query(collection(db, options.table), ...constraints)
            : query(collection(db, options.table));

        // Fetch data immediately first (faster initial load)
        const fetchData = async () => {
            try {
                const snapshot = await getDocs(q);
                const items = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as T[];
                setData(items);
                setIsLoading(false);
                setError(null);
                hasInitialData.current = true;
            } catch (err: any) {
                console.error('Error fetching data:', err);
                setError(err);
                setIsLoading(false);
            }
        };

        fetchData();

        // Set up real-time listener for updates
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                })) as T[];
                setData(items);
                setIsLoading(false);
                setError(null);
                hasInitialData.current = true;
            },
            (err) => {
                console.error('Realtime error:', err);
                // Must not use `data` from closure — it is stale and stays null, so errors
                // would always surface even after a successful getDocs/onSnapshot read.
                if (!hasInitialData.current) {
                    setError(err);
                    setIsLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, [optionsKey]);

    return { data, isLoading, error };
}

// ─── Real-time Single Row Hook ──────────────────────────

interface UseRealtimeRowOptions {
    table: string;
    id: string | null | undefined;
}

interface UseRealtimeRowResult<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
}

export function useRealtimeRow<T = any>(
    options: UseRealtimeRowOptions
): UseRealtimeRowResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!options.id || !db) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const docRef = doc(db, options.table, options.id);

        // Fetch immediately first
        const fetchData = async () => {
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setData({ ...docSnap.data(), id: docSnap.id } as T);
                } else {
                    setData(null);
                }
                setIsLoading(false);
            } catch (err: any) {
                console.error('Error fetching row:', err);
                setError(err);
                setIsLoading(false);
            }
        };

        fetchData();

        // Set up real-time listener
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setData({ ...docSnap.data(), id: docSnap.id } as T);
                } else {
                    setData(null);
                }
                setIsLoading(false);
            },
            (err) => {
                console.error('Realtime row error:', err);
                setError(err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [options.table, options.id]);

    return { data, isLoading, error };
}

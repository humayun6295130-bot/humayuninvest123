'use client';

import { useState, useEffect, useMemo } from 'react';
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

    const optionsKey = useMemo(
        () => JSON.stringify(options),
        [options.table, JSON.stringify(options.filters), JSON.stringify(options.orderByColumn), options.limitCount, options.enabled]
    );

    useEffect(() => {
        if (options.enabled === false) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        if (!db) {
            setError(new Error('Firebase not configured'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Build query constraints
        const constraints: QueryConstraint[] = [];

        if (options.filters) {
            for (const filter of options.filters) {
                constraints.push(where(filter.column, filter.operator, filter.value));
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
            },
            (err) => {
                console.error('Realtime error:', err);
                // Don't set error if we already have data
                if (!data) {
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
        if (!options.id) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        if (!db) {
            setError(new Error('Firebase not configured'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const docRef = doc(db, options.table, options.id);

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
                setError(err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [options.table, options.id]);

    return { data, isLoading, error };
}

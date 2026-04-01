'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';
import {
    DEPOSIT_INCOME_TIERS,
    parseDepositTiersFirestore,
    setClientDepositIncomeTiers,
    type DepositIncomeTier,
} from '@/lib/deposit-income-tiers';

interface FirebaseContextState {
    user: User | null;
    isLoading: boolean;
    userProfile: any | null;
    isProfileLoading: boolean;
    isConfigured: boolean;
    /** Live deposit → daily % tiers (Firestore override or defaults). */
    depositIncomeTiers: DepositIncomeTier[];
}

const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [depositIncomeTiers, setDepositIncomeTiers] = useState<DepositIncomeTier[]>(DEPOSIT_INCOME_TIERS);
    const isConfigured = isFirebaseConfigured();

    // Platform deposit tier table (public read) — keeps claims / dashboard in sync with admin edits.
    useEffect(() => {
        if (!isConfigured || !db) {
            setDepositIncomeTiers(DEPOSIT_INCOME_TIERS);
            setClientDepositIncomeTiers(null);
            return;
        }
        const ref = doc(db, 'platform_settings', 'main');
        const unsub = onSnapshot(
            ref,
            (snap) => {
                const parsed = parseDepositTiersFirestore(snap.data()?.deposit_tiers);
                const next = parsed ?? DEPOSIT_INCOME_TIERS;
                setDepositIncomeTiers(next);
                setClientDepositIncomeTiers(parsed);
            },
            () => {
                setDepositIncomeTiers(DEPOSIT_INCOME_TIERS);
                setClientDepositIncomeTiers(null);
            }
        );
        return () => unsub();
    }, [isConfigured]);

    useEffect(() => {
        if (!isConfigured || !auth) {
            setIsLoading(false);
            return;
        }

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(
            auth,
            (currentUser) => {
                setUser(currentUser);
                setIsLoading(false);
            },
            (error) => {
                console.warn('Auth state error:', error);
                setUser(null);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [isConfigured]);

    // Fetch user profile when user changes
    useEffect(() => {
        if (!isConfigured || !user || !db) {
            setUserProfile(null);
            setIsProfileLoading(false);
            return;
        }

        const uid = user.uid;
        const email = user.email;
        const firestore = db;

        setIsProfileLoading(true);

        const userRef = doc(firestore, 'users', uid);
        let unsubscribe: (() => void) | null = null;
        let cancelled = false;

        async function ensureProfileDocByUid() {
            // Some legacy users were created with auto-id docs instead of uid.
            const snap = await getDoc(userRef);
            if (snap.exists()) return;
            if (!email) return;

            const legacyQ = query(
                collection(firestore, 'users'),
                where('email', '==', email),
                limit(1)
            );
            const legacySnap = await getDocs(legacyQ);
            if (legacySnap.empty) return;

            const legacy = legacySnap.docs[0];
            await setDoc(
                userRef,
                {
                    ...legacy.data(),
                    migrated_from_doc_id: legacy.id,
                    updated_at: new Date().toISOString(),
                },
                { merge: true }
            );
        }

        void (async () => {
            try {
                await ensureProfileDocByUid();
            } catch (err) {
                console.warn('Profile migration check failed:', err);
            }

            if (cancelled) return;
            unsubscribe = onSnapshot(
                userRef,
                (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile({ ...docSnap.data(), id: docSnap.id });
                    } else {
                        setUserProfile(null);
                    }
                    setIsProfileLoading(false);
                },
                (error) => {
                    console.warn('Profile fetch error:', error);
                    setUserProfile(null);
                    setIsProfileLoading(false);
                }
            );
        })();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [user, isConfigured]);

    const contextValue = useMemo((): FirebaseContextState => ({
        user,
        isLoading,
        userProfile,
        isProfileLoading,
        isConfigured,
        depositIncomeTiers,
    }), [user, isLoading, userProfile, isProfileLoading, isConfigured, depositIncomeTiers]);

    return (
        <FirebaseContext.Provider value={contextValue}>
            {children}
        </FirebaseContext.Provider>
    );
}

export function useFirebaseContext() {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebaseContext must be used within a FirebaseProvider');
    }
    return context;
}

'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';

interface FirebaseContextState {
    user: User | null;
    isLoading: boolean;
    userProfile: any | null;
    isProfileLoading: boolean;
    isConfigured: boolean;
}

const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const isConfigured = isFirebaseConfigured();

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

        setIsProfileLoading(true);

        const userRef = doc(db, 'users', user.uid);
        let unsubscribe: (() => void) | null = null;
        let cancelled = false;

        async function ensureProfileDocByUid() {
            // Some legacy users were created with auto-id docs instead of uid.
            const snap = await getDoc(userRef);
            if (snap.exists()) return;
            if (!user.email) return;

            const legacyQ = query(
                collection(db, 'users'),
                where('email', '==', user.email),
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
    }), [user, isLoading, userProfile, isProfileLoading, isConfigured]);

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

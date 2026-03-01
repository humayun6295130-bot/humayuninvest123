'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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

        // Set up real-time listener for user profile
        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(
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

        return () => unsubscribe();
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

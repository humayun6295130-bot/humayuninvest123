'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { supabase } from './config';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

interface SupabaseContextState {
    supabase: SupabaseClient;
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    userProfile: any | null;
    isProfileLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextState | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                setSession(newSession);
                setUser(newSession?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Fetch user profile when user changes
    useEffect(() => {
        if (!user) {
            setUserProfile(null);
            setIsProfileLoading(false);
            return;
        }

        setIsProfileLoading(true);

        // Initial fetch
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setUserProfile(data);
            }
            setIsProfileLoading(false);
        };

        fetchProfile();

        // Real-time subscription for user profile
        const channel = supabase
            .channel(`user-profile-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        setUserProfile(payload.new);
                    } else if (payload.eventType === 'DELETE') {
                        setUserProfile(null);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const contextValue = useMemo((): SupabaseContextState => ({
        supabase,
        user,
        session,
        isLoading,
        userProfile,
        isProfileLoading,
    }), [user, session, isLoading, userProfile, isProfileLoading]);

    return (
        <SupabaseContext.Provider value={contextValue}>
            {children}
        </SupabaseContext.Provider>
    );
}

export function useSupabaseContext() {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabaseContext must be used within a SupabaseProvider');
    }
    return context;
}

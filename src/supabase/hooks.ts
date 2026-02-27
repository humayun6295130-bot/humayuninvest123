'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './config';
import { useSupabaseContext } from './provider';
import type { User, SupabaseClient } from '@supabase/supabase-js';

// ─── Core Hooks ───────────────────────────────────────

export function useSupabase(): SupabaseClient {
    return useSupabaseContext().supabase;
}

export function useUser(): { user: User | null; isUserLoading: boolean; userProfile: any | null; isProfileLoading: boolean } {
    const { user, isLoading, userProfile, isProfileLoading } = useSupabaseContext();
    return { user, isUserLoading: isLoading, userProfile, isProfileLoading };
}

export function useAuth() {
    const { supabase: client } = useSupabaseContext();
    return {
        signIn: (email: string, password: string) =>
            client.auth.signInWithPassword({ email, password }),
        signUp: (email: string, password: string) =>
            client.auth.signUp({ email, password }),
        signOut: () => client.auth.signOut(),
    };
}

// ─── Real-time Collection Hook ─────────────────────────

interface UseRealtimeCollectionOptions {
    table: string;
    filters?: { column: string; operator: string; value: any }[];
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
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
        [options.table, JSON.stringify(options.filters), JSON.stringify(options.orderBy), options.limit, options.enabled]
    );

    useEffect(() => {
        if (options.enabled === false) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const fetchData = async () => {
            try {
                let query = supabase.from(options.table).select('*');

                if (options.filters) {
                    for (const filter of options.filters) {
                        query = query.filter(filter.column, filter.operator, filter.value);
                    }
                }

                if (options.orderBy) {
                    query = query.order(options.orderBy.column, {
                        ascending: options.orderBy.ascending ?? true,
                    });
                }

                if (options.limit) {
                    query = query.limit(options.limit);
                }

                const { data: result, error: fetchError } = await query;

                if (fetchError) {
                    setError(new Error(fetchError.message));
                    setData(null);
                } else {
                    setData(result as T[]);
                }
            } catch (err: any) {
                setError(err);
                setData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Set up real-time subscription
        const channel = supabase
            .channel(`realtime-${options.table}-${optionsKey}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: options.table,
                },
                () => {
                    // Re-fetch on any change to keep data consistent with filters
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [optionsKey]);

    return { data, isLoading, error };
}

// ─── Real-time Single Row Hook ──────────────────────────

interface UseRealtimeRowOptions {
    table: string;
    id: string | null | undefined;
    column?: string; // defaults to 'id'
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

    const column = options.column || 'id';

    useEffect(() => {
        if (!options.id) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const fetchData = async () => {
            try {
                const { data: result, error: fetchError } = await supabase
                    .from(options.table)
                    .select('*')
                    .eq(column, options.id!)
                    .single();

                if (fetchError) {
                    if (fetchError.code === 'PGRST116') {
                        // Row not found
                        setData(null);
                    } else {
                        setError(new Error(fetchError.message));
                        setData(null);
                    }
                } else {
                    setData(result as T);
                }
            } catch (err: any) {
                setError(err);
                setData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Real-time subscription
        const channel = supabase
            .channel(`realtime-row-${options.table}-${options.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: options.table,
                    filter: `${column}=eq.${options.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setData(null);
                    } else {
                        setData(payload.new as T);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [options.table, options.id, column]);

    return { data, isLoading, error };
}

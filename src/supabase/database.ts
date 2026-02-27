import { supabase } from './config';

// ─── Insert ─────────────────────────────────────────────

export async function insertRow(table: string, data: Record<string, any>) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

    if (error) {
        console.error(`Error inserting into ${table}:`, error.message);
        throw error;
    }
    return result;
}

// ─── Update ─────────────────────────────────────────────

export async function updateRow(
    table: string,
    id: string,
    data: Record<string, any>,
    idColumn: string = 'id'
) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq(idColumn, id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating ${table}:`, error.message);
        throw error;
    }
    return result;
}

// ─── Upsert ─────────────────────────────────────────────

export async function upsertRow(table: string, data: Record<string, any>) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    const { data: result, error } = await supabase
        .from(table)
        .upsert(data)
        .select()
        .single();

    if (error) {
        console.error(`Error upserting into ${table}:`, error.message);
        throw error;
    }
    return result;
}

// ─── Delete ─────────────────────────────────────────────

export async function deleteRow(
    table: string,
    id: string,
    idColumn: string = 'id'
) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    const { error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, id);

    if (error) {
        console.error(`Error deleting from ${table}:`, error.message);
        throw error;
    }
}

// ─── Fetch Rows ─────────────────────────────────────────

export async function fetchRows(
    table: string,
    options?: {
        filters?: { column: string; operator: string; value: any }[];
        orderBy?: { column: string; ascending?: boolean };
        limit?: number;
    }
) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    let query = supabase.from(table).select('*');

    if (options?.filters) {
        for (const filter of options.filters) {
            query = query.filter(filter.column, filter.operator, filter.value);
        }
    }

    if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? true,
        });
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error(`Error fetching from ${table}:`, error.message);
        throw error;
    }
    return data;
}

// ─── Fetch Single Row ───────────────────────────────────

export async function fetchRow(
    table: string,
    id: string,
    idColumn: string = 'id'
) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(idColumn, id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error(`Error fetching from ${table}:`, error.message);
        throw error;
    }
    return data;
}

// ─── Batch Update (replaces Firebase writeBatch) ────────

export async function batchUpdate(
    operations: Array<{
        table: string;
        id: string;
        data: Record<string, any>;
        idColumn?: string;
    }>
) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    // Supabase doesn't have native batch writes, so we run them concurrently
    const results = await Promise.all(
        operations.map((op) =>
            supabase
                .from(op.table)
                .update(op.data)
                .eq(op.idColumn || 'id', op.id)
        )
    );

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
        console.error('Batch update errors:', errors.map((e) => e.error?.message));
        throw new Error('Some batch operations failed');
    }
}

// ─── RPC call for incrementing values ───────────────────

export async function incrementBalance(userId: string, amount: number) {
    if (!supabase) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    const { data, error } = await supabase!.rpc('increment_balance', {
        user_id: userId,
        amount: amount,
    });

    if (error) {
        // Fallback: fetch current balance then update
        const user = await fetchRow('users', userId);
        if (user) {
            return updateRow('users', userId, {
                balance: (user.balance || 0) + amount,
            });
        }
        throw error;
    }
    return data;
}

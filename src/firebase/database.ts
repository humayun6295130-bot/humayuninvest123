import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    increment,
    DocumentReference,
    QueryConstraint
} from 'firebase/firestore';
import { db } from './config';

// ─── Insert ─────────────────────────────────────────────

export async function insertRow<T extends Record<string, any>>(table: string, data: T): Promise<T & { id: string }> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const docRef = await addDoc(collection(db, table), {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        return { ...data, id: docRef.id } as T & { id: string };
    } catch (error: any) {
        console.error(`Error inserting into ${table}:`, error.message);
        throw error;
    }
}

// ─── Update ─────────────────────────────────────────────

export async function updateRow<T extends Record<string, any>>(
    table: string,
    id: string,
    data: Partial<T>,
    idColumn: string = 'id'
): Promise<void> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const docRef = doc(db, table, id);
        await updateDoc(docRef, {
            ...data,
            updated_at: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error(`Error updating ${table}:`, error.message);
        throw error;
    }
}

// ─── Upsert (Set with merge) ────────────────────────────

export async function upsertRow<T extends Record<string, any>>(table: string, data: T & { id: string }): Promise<void> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const { id, ...restData } = data;
        const docRef = doc(db, table, id);
        await setDoc(docRef, {
            ...restData,
            updated_at: new Date().toISOString(),
        }, { merge: true });
    } catch (error: any) {
        console.error(`Error upserting into ${table}:`, error.message);
        throw error;
    }
}

// ─── Delete ─────────────────────────────────────────────

export async function deleteRow(table: string, id: string): Promise<void> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const docRef = doc(db, table, id);
        await deleteDoc(docRef);
    } catch (error: any) {
        console.error(`Error deleting from ${table}:`, error.message);
        throw error;
    }
}

// ─── Fetch Rows ─────────────────────────────────────────

export interface FetchOptions {
    filters?: { column: string; operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'array-contains' | 'in'; value: any }[];
    orderBy?: { column: string; direction?: 'asc' | 'desc' };
    limit?: number;
}

export async function fetchRows<T = any>(table: string, options?: FetchOptions): Promise<(T & { id: string })[]> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const constraints: QueryConstraint[] = [];

        if (options?.filters) {
            for (const filter of options.filters) {
                constraints.push(where(filter.column, filter.operator, filter.value));
            }
        }

        if (options?.orderBy) {
            constraints.push(orderBy(options.orderBy.column, options.orderBy.direction || 'asc'));
        }

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(collection(db, table), ...constraints);
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        })) as (T & { id: string })[];
    } catch (error: any) {
        console.error(`Error fetching from ${table}:`, error.message);
        throw error;
    }
}

// ─── Fetch Single Row ───────────────────────────────────

export async function fetchRow<T = any>(table: string, id: string): Promise<(T & { id: string }) | null> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const docRef = doc(db, table, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            ...docSnap.data(),
            id: docSnap.id,
        } as T & { id: string };
    } catch (error: any) {
        console.error(`Error fetching from ${table}:`, error.message);
        throw error;
    }
}

// ─── Batch Update (Firebase writeBatch) ─────────────────

export interface BatchOperation {
    table: string;
    id: string;
    data: Record<string, any>;
}

export async function batchUpdate(operations: BatchOperation[]): Promise<void> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const batch = writeBatch(db);

        for (const op of operations) {
            const docRef = doc(db, op.table, op.id);
            batch.update(docRef, {
                ...op.data,
                updated_at: new Date().toISOString(),
            });
        }

        await batch.commit();
    } catch (error: any) {
        console.error('Batch update errors:', error.message);
        throw new Error('Some batch operations failed');
    }
}

/** Create many documents in chunks of 500 (Firestore batch limit). */
export async function batchInsertRows(table: string, rows: Record<string, any>[]): Promise<void> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    if (rows.length === 0) return;
    const CHUNK = 500;
    const now = new Date().toISOString();
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        for (const data of chunk) {
            const ref = doc(collection(db, table));
            batch.set(ref, {
                ...data,
                created_at: data.created_at ?? now,
                updated_at: now,
            });
        }
        await batch.commit();
    }
}

// ─── Increment Balance ──────────────────────────────────

export async function incrementBalance(userId: string, amount: number): Promise<void> {
    if (!db) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            balance: increment(amount),
            updated_at: new Date().toISOString(),
        });
    } catch (error: any) {
        // Fallback: fetch current balance then update
        const user = await fetchRow('users', userId);
        if (user) {
            await updateRow('users', userId, {
                balance: (user.balance || 0) + amount,
            });
        } else {
            throw error;
        }
    }
}

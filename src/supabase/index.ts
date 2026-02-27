// Supabase barrel exports
export { supabase } from './config';
export { SupabaseProvider, useSupabaseContext } from './provider';
export {
    useSupabase,
    useUser,
    useAuth,
    useRealtimeCollection,
    useRealtimeRow,
} from './hooks';
export {
    insertRow,
    updateRow,
    upsertRow,
    deleteRow,
    fetchRows,
    fetchRow,
    batchUpdate,
    incrementBalance,
} from './database';
export { uploadFile, getPublicUrl } from './storage';

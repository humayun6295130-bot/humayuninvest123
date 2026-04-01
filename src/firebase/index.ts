// Firebase barrel exports
export { auth, db, storage, isFirebaseConfigured } from './config';
export { FirebaseProvider, useFirebaseContext } from './provider';
export {
    useFirebase,
    useUser,
    useAuth,
    useRealtimeCollection,
    useRealtimeRow,
    useDashboardData,
} from './hooks';
export {
    insertRow,
    updateRow,
    upsertRow,
    deleteRow,
    fetchRows,
    fetchRow,
    batchUpdate,
    batchInsertRows,
    incrementBalance,
    type FetchOptions,
    type BatchOperation,
} from './database';
export { uploadFile, getPublicUrl } from './storage';

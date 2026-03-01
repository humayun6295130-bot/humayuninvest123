// Firebase barrel exports
export { auth, db, storage, isFirebaseConfigured } from './config';
export { FirebaseProvider, useFirebaseContext } from './provider';
export {
    useFirebase,
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
    type FetchOptions,
    type BatchOperation,
} from './database';
export { uploadFile, getPublicUrl } from './storage';

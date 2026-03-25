import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.authDomain,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.databaseURL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.appId,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.measurementId
};

// Initialize Firebase only if config is available
const isFirebaseConfigured = () => {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

// Initialize Firebase app
const app = isFirebaseConfigured()
    ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
    : null;

// Export Firebase services
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

// Set persistent login (stays logged in across browser sessions)
if (auth && typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// Initialize Analytics (only in browser environment)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (app && typeof window !== 'undefined') {
    isSupported().then((supported: boolean) => {
        if (supported) {
            analytics = getAnalytics(app!);
        }
    });
}
export { analytics };

// Helper to check if Firebase is configured
export { isFirebaseConfigured };
export default app;

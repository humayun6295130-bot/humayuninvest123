import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAQslQz5Pt2Mfo_RdDo2FY7JZ4_EMZj7ak",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "invest-1e4f7.firebaseapp.com",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://invest-1e4f7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "invest-1e4f7",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "invest-1e4f7.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "40597371033",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:40597371033:web:2a1a4fb2c899bf3feca008",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-73Z7WKS6VG"
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

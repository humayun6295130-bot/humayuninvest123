import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Server-only Firebase Admin (set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel).
 * JSON string of the service account key from Firebase Console → Project settings → Service accounts.
 */
function getAdminApp(): App | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) return null;
    try {
        if (getApps().length > 0) return getApps()[0]!;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return initializeApp({ credential: cert(parsed as any) });
    } catch {
        return null;
    }
}

export function getAdminFirestore() {
    const app = getAdminApp();
    if (!app) return null;
    return getFirestore(app);
}

export function getAdminAuth() {
    const app = getAdminApp();
    if (!app) return null;
    return getAuth(app);
}

export function isFirebaseAdminConfigured(): boolean {
    return !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
}

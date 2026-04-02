import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { linkExistingReferralAdmin } from '@/lib/link-existing-referral-admin';
import { isAdminProfile } from '@/lib/user-role';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/link-referral
 * Auth: Bearer Firebase ID token; caller must be admin (users.role or users.is_admin).
 * Body: { childUid, sponsorUid, force?: boolean, dryRun?: boolean }
 */
export async function POST(request: NextRequest) {
    if (!isFirebaseAdminConfigured()) {
        return NextResponse.json(
            { ok: false, error: 'Server missing FIREBASE_SERVICE_ACCOUNT_JSON' },
            { status: 501 }
        );
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
        return NextResponse.json({ ok: false, error: 'Firebase Admin failed to initialize' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!idToken) {
        return NextResponse.json({ ok: false, error: 'Missing Authorization Bearer token' }, { status: 401 });
    }

    let decoded: { uid: string };
    try {
        decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const callerSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!callerSnap.exists) {
        return NextResponse.json({ ok: false, error: 'Caller user profile not found' }, { status: 403 });
    }
    const callerData = callerSnap.data()!;
    const callerAdmin =
        isAdminProfile({ role: callerData.role }) || callerData.is_admin === true;
    if (!callerAdmin) {
        return NextResponse.json({ ok: false, error: 'Admin only' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const child = String(body.childUid ?? body.child ?? '').trim();
    const sponsor = String(body.sponsorUid ?? body.sponsor ?? '').trim();
    const force = body.force === true;
    const dryRun = body.dryRun === true;

    const result = await linkExistingReferralAdmin(adminDb, { child, sponsor, force, dryRun });
    if (result.ok) {
        return NextResponse.json({ ok: true, message: result.message });
    }
    const status =
        result.error.includes('already') || result.error.includes('Multiple') ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
}

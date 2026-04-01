import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { isValidBEP20Address } from '@/lib/bep20';
import { getAdminAuth, getAdminFirestore, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function requireUid(request: NextRequest): Promise<
    | { ok: true; uid: string; adminDb: NonNullable<ReturnType<typeof getAdminFirestore>> }
    | { ok: false; response: NextResponse }
> {
    if (!isFirebaseAdminConfigured()) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error:
                        'Wallet API requires FIREBASE_SERVICE_ACCOUNT_JSON on the server. The app saves BEP20 addresses from Settings via Firestore on the client when Admin is not used.',
                },
                { status: 501 }
            ),
        };
    }
    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Firebase Admin failed to initialize' }, { status: 500 }),
        };
    }
    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!idToken) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Missing Authorization: Bearer <Firebase ID token>' },
                { status: 401 }
            ),
        };
    }
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return { ok: true, uid: decoded.uid, adminDb };
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
        };
    }
}

/**
 * POST /api/user/settings/wallet
 * Body: { walletAddress: string }
 * Auth: Authorization: Bearer <Firebase ID token>
 * Persists to `users/{uid}` — same fields as Settings UI (`bep20_wallet_address`, etc.).
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireUid(request);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }
        if (!isValidBEP20Address(walletAddress)) {
            return NextResponse.json(
                { error: 'Invalid BEP20 address. Must start with 0x and be 42 characters long.' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        await auth.adminDb
            .collection('users')
            .doc(auth.uid)
            .set(
                {
                    bep20_wallet_address: walletAddress.toLowerCase(),
                    bep20_wallet_verified: true,
                    bep20_wallet_added_at: now,
                    updated_at: now,
                },
                { merge: true }
            );

        return NextResponse.json({
            success: true,
            message: 'Wallet address saved successfully',
            data: {
                walletAddress: walletAddress.toLowerCase(),
                network: 'BEP20 (BNB Smart Chain)',
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to save wallet address';
        console.error('Save wallet error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * GET /api/user/settings/wallet
 * Auth: Authorization: Bearer <Firebase ID token>
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await requireUid(request);
        if (!auth.ok) return auth.response;

        const snap = await auth.adminDb.collection('users').doc(auth.uid).get();
        const data = snap.exists ? snap.data() : null;
        const savedAddress = typeof data?.bep20_wallet_address === 'string' ? data.bep20_wallet_address : '';

        return NextResponse.json({
            success: true,
            data: {
                walletAddress: savedAddress,
                hasSavedAddress: !!savedAddress,
                network: 'BEP20 (BNB Smart Chain)',
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get wallet address';
        console.error('Get wallet error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/user/settings/wallet
 * Auth: Authorization: Bearer <Firebase ID token>
 */
export async function DELETE(request: NextRequest) {
    try {
        const auth = await requireUid(request);
        if (!auth.ok) return auth.response;

        const ref = auth.adminDb.collection('users').doc(auth.uid);
        const snap = await ref.get();
        if (snap.exists) {
            await ref.update({
                bep20_wallet_address: FieldValue.delete(),
                bep20_wallet_verified: false,
                bep20_wallet_added_at: FieldValue.delete(),
                updated_at: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Wallet address removed successfully',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to remove wallet address';
        console.error('Delete wallet error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { isValidBEP20Address } from '@/lib/bep20';

/**
 * POST /api/user/settings/wallet
 * 
 * Save user's BEP20 wallet address for withdrawals
 * 
 * Body: {
 *   walletAddress: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress } = body;

        // Validate wallet address
        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        // Validate BEP20 address format
        if (!isValidBEP20Address(walletAddress)) {
            return NextResponse.json(
                { error: 'Invalid BEP20 address. Must start with 0x and be 42 characters long.' },
                { status: 400 }
            );
        }

        // Get user from session (you need to implement authentication)
        // For now, we'll return the address that would be saved
        // In production, get userId from session
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // TODO: Save to database
        // await updateDoc(doc(db, 'users', userId), {
        //     saved_bep20_address: walletAddress,
        //     updated_at: new Date().toISOString(),
        // });

        return NextResponse.json({
            success: true,
            message: 'Wallet address saved successfully',
            data: {
                walletAddress,
                network: 'BEP20 (BNB Smart Chain)',
            }
        });

    } catch (error: any) {
        console.error('Save wallet error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save wallet address' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/user/settings/wallet
 * 
 * Get user's saved BEP20 wallet address
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // TODO: Get from database
        // const userDoc = await getDoc(doc(db, 'users', userId));
        // const savedAddress = userDoc.data()?.saved_bep20_address || '';

        // Placeholder response
        const savedAddress = '';

        return NextResponse.json({
            success: true,
            data: {
                walletAddress: savedAddress,
                hasSavedAddress: !!savedAddress,
                network: 'BEP20 (BNB Smart Chain)',
            }
        });

    } catch (error: any) {
        console.error('Get wallet error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get wallet address' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/user/settings/wallet
 * 
 * Remove user's saved BEP20 wallet address
 */
export async function DELETE(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // TODO: Remove from database
        // await updateDoc(doc(db, 'users', userId), {
        //     saved_bep20_address: null,
        //     updated_at: new Date().toISOString(),
        // });

        return NextResponse.json({
            success: true,
            message: 'Wallet address removed successfully'
        });

    } catch (error: any) {
        console.error('Delete wallet error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to remove wallet address' },
            { status: 500 }
        );
    }
}

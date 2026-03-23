import { NextRequest, NextResponse } from 'next/server';
import { isValidBEP20Address } from '@/lib/bep20';

/**
 * GET /api/bep20/validate-address?address=...
 * 
 * Validate a BEP20 address format (BNB Smart Chain)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json(
                { error: 'Address parameter is required' },
                { status: 400 }
            );
        }

        const isValid = isValidBEP20Address(address);

        return NextResponse.json({
            success: true,
            address,
            isValid,
            message: isValid
                ? 'Valid BEP20 address format (BNB Smart Chain)'
                : 'Invalid BEP20 address format. Must start with 0x and be 42 characters long.',
        });
    } catch (error: any) {
        console.error('BEP20 Address validation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to validate BEP20 address' },
            { status: 500 }
        );
    }
}
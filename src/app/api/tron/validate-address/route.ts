import { NextRequest, NextResponse } from 'next/server';
import { isValidTronAddress } from '@/lib/tron';

/**
 * GET /api/tron/validate-address?address=...
 * 
 * Validate a TRON address format
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

        const isValid = isValidTronAddress(address);

        return NextResponse.json({
            success: true,
            address,
            isValid,
            message: isValid
                ? 'Valid TRON address format'
                : 'Invalid TRON address format. Must start with T and be 34 characters long.',
        });
    } catch (error: any) {
        console.error('Address validation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to validate address' },
            { status: 500 }
        );
    }
}

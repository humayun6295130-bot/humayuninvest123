import { NextRequest, NextResponse } from 'next/server';
import { createPaymentVerificationService } from '@/lib/etherscan-payment';
import {
    BlockchainNetwork,
    isValidEthAddress,
    ERROR_MESSAGES,
    NETWORK_CONFIGS,
    formatWei,
} from '@/lib/etherscan';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

function getPaymentService() {
    return createPaymentVerificationService(ETHERSCAN_API_KEY);
}

// ============================================================================
// GET WALLET BALANCE
// ============================================================================

/**
 * POST /api/etherscan/balance
 * 
 * Get wallet balance for a specific address
 * 
 * Body: {
 *   address: string;
 *   network?: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        if (!ETHERSCAN_API_KEY) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_API_KEY },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { address, network = 'ethereum' } = body;

        // Validate address
        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        if (!isValidEthAddress(address)) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_ADDRESS },
                { status: 400 }
            );
        }

        // Validate network
        if (!NETWORK_CONFIGS[network as BlockchainNetwork]) {
            return NextResponse.json(
                { error: `Unsupported network: ${network}` },
                { status: 400 }
            );
        }

        const service = getPaymentService();
        service.addNetworkClient(network as BlockchainNetwork, ETHERSCAN_API_KEY);

        const result = await service.getWalletBalance(address, network as BlockchainNetwork);

        return NextResponse.json({
            success: true,
            data: {
                address,
                network,
                balance: result.balanceFormatted,
                balanceWei: result.balance,
                symbol: NETWORK_CONFIGS[network as BlockchainNetwork].symbol,
            },
        });

    } catch (error: any) {
        console.error('Balance check error:', error);
        return NextResponse.json(
            { error: error.message || ERROR_MESSAGES.INTERNAL_ERROR },
            { status: 500 }
        );
    }
}

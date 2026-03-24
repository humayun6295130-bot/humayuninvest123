import { NextRequest, NextResponse } from 'next/server';
import {
    createPaymentVerificationService,
    PaymentVerificationService,
} from '@/lib/etherscan-payment';
import {
    BlockchainNetwork,
    isValidTxHash,
    isValidEthAddress,
    ERROR_MESSAGES,
    NETWORK_CONFIGS,
} from '@/lib/etherscan';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Get API key from environment
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

// Create payment verification service instance
let paymentService: PaymentVerificationService | null = null;

function getPaymentService(): PaymentVerificationService {
    if (!paymentService) {
        paymentService = createPaymentVerificationService(
            ETHERSCAN_API_KEY,
            {
                minConfirmations: 12,
                checkDuplicate: true,
                validateReceipt: true,
                checkFailedStatus: true,
                amountTolerance: 1,
            },
            true // Enable audit logging
        );

        // Add network clients for supported networks
        const networks: BlockchainNetwork[] = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];
        for (const network of networks) {
            paymentService.addNetworkClient(network, ETHERSCAN_API_KEY);
        }
    }
    return paymentService;
}

// ============================================================================
// VERIFY TRANSACTION
// ============================================================================

/**
 * POST /api/etherscan/verify
 * 
 * Verify a cryptocurrency transaction on the blockchain
 * 
 * Body: {
 *   txHash: string;
 *   network?: string;
 *   token?: string;
 *   expectedRecipient?: string;
 *   expectedAmount?: number;
 *   minConfirmations?: number;
 *   senderAddress?: string;
 *   userId?: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Check API key
        if (!ETHERSCAN_API_KEY) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_API_KEY },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            txHash,
            network = 'ethereum',
            token = 'USDT',
            expectedRecipient,
            expectedAmount,
            minConfirmations,
            senderAddress,
            userId,
        } = body;

        // Validate required fields
        if (!txHash) {
            return NextResponse.json(
                { error: 'Transaction hash (txHash) is required' },
                { status: 400 }
            );
        }

        // Validate transaction hash format
        if (!isValidTxHash(txHash)) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_HASH },
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

        // Validate expected recipient if provided
        if (expectedRecipient && !isValidEthAddress(expectedRecipient)) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_ADDRESS },
                { status: 400 }
            );
        }

        // Validate sender address if provided
        if (senderAddress && !isValidEthAddress(senderAddress)) {
            return NextResponse.json(
                { error: 'Invalid sender address format' },
                { status: 400 }
            );
        }

        // Get payment service
        const service = getPaymentService();

        // Verify payment
        const result = await service.verifyPayment({
            txHash,
            network: network as BlockchainNetwork,
            token,
            expectedRecipient,
            expectedAmount,
            minConfirmations,
            senderAddress,
            userId,
        });

        // Return result
        return NextResponse.json({
            success: true,
            data: result,
            message: result.valid
                ? 'Payment verified successfully'
                : `Payment verification failed: ${result.status}`,
        });

    } catch (error: any) {
        console.error('Payment verification error:', error);
        return NextResponse.json(
            { error: error.message || ERROR_MESSAGES.INTERNAL_ERROR },
            { status: 500 }
        );
    }
}

// ============================================================================
// CHECK TRANSACTION STATUS
// ============================================================================

/**
 * GET /api/etherscan/verify?txHash=xxx&network=ethereum
 * 
 * Get transaction confirmation status
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const txHash = searchParams.get('txHash');
        const network = (searchParams.get('network') || 'ethereum') as BlockchainNetwork;

        // Check API key
        if (!ETHERSCAN_API_KEY) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_API_KEY },
                { status: 401 }
            );
        }

        // Validate required fields
        if (!txHash) {
            return NextResponse.json(
                { error: 'Transaction hash (txHash) is required' },
                { status: 400 }
            );
        }

        // Validate transaction hash format
        if (!isValidTxHash(txHash)) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_HASH },
                { status: 400 }
            );
        }

        // Get payment service
        const service = getPaymentService();

        // Check confirmations
        const confirmations = await service.checkConfirmations(txHash, network);

        return NextResponse.json({
            success: true,
            data: confirmations,
        });

    } catch (error: any) {
        console.error('Confirmation check error:', error);
        return NextResponse.json(
            { error: error.message || ERROR_MESSAGES.INTERNAL_ERROR },
            { status: 500 }
        );
    }
}

# Etherscan API V2 Integration System

## Overview

This document describes the comprehensive Etherscan API V2 integration system for payment verification in the investment platform. The system provides automatic blockchain transaction verification, real-time monitoring, multi-chain support, and webhook notifications.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Configuration](#configuration)
3. [Core Components](#core-components)
4. [API Routes](#api-routes)
5. [Plan-Based Access Control](#plan-based-access-control)
6. [Webhook System](#webhook-system)
7. [Usage Examples](#usage-examples)
8. [Environment Variables](#environment-variables)
9. [Security Best Practices](#security-best-practices)

---

## Architecture Overview

The system is built with a modular architecture consisting of:

- **Configuration Layer** (`src/lib/etherscan.ts`) - Network configs, token contracts, plan limits
- **API Client** (`src/lib/etherscan-client.ts`) - Rate-limited, retry-enabled Etherscan API client
- **Payment Service** (`src/lib/etherscan-payment.ts`) - Transaction verification, audit logging
- **Webhook Manager** (`src/lib/etherscan-webhook.ts`) - Event notifications
- **Access Control** (`src/lib/etherscan-access.ts`) - Plan-based restrictions

---

## Configuration

### Network Support

| Network | Chain ID | Symbol | Explorer |
|---------|----------|--------|----------|
| Ethereum | 1 | ETH | etherscan.io |
| BSC | 56 | BNB | bscscan.com |
| Polygon | 137 | MATIC | polygonscan.com |
| Arbitrum | 42161 | ETH | arbiscan.io |
| Optimism | 10 | ETH | optimistic.etherscan.io |
| Avalanche | 43114 | AVAX | snowtrace.io |
| Fantom | 250 | FTM | ftmscan.com |

### Supported Tokens

```typescript
// Token configurations
USDT: { decimals: 6, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' }
USDC: { decimals: 6, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }
BNB: { decimals: 18, native: true }
ETH: { decimals: 18, native: true }
MATIC: { decimals: 18, native: true }
```

---

## Core Components

### 1. Etherscan API Client

The API client handles all communication with Etherscan APIs with built-in rate limiting and retry mechanisms.

**File**: `src/lib/etherscan-client.ts`

```typescript
import { createEtherscanClient, EtherscanClient } from '@/lib/etherscan-client';

// Create client for specific network
const client = createEtherscanClient('YOUR_API_KEY', 'ethereum');

// Get transaction details
const tx = await client.getTransactionByHash('0x...');

// Get account balance
const balance = await client.getAccountBalance('0x...');

// Get gas prices
const gasPrices = await client.estimateGasPrice();
// Result: { slow: '20', average: '30', fast: '50' }

// Get token balance
const tokenBalance = await client.getTokenBalance(
    '0x...', // address
    '0xdAC17F958D2ee523a2206206994597C13D831ec7' // USDT contract
);
```

### 2. Payment Verification Service

The payment verification service handles transaction verification with multi-chain support.

**File**: `src/lib/etherscan-payment.ts`

```typescript
import { createPaymentVerificationService } from '@/lib/etherscan-payment';

// Create service
const service = createPaymentVerificationService('YOUR_API_KEY', {
    minConfirmations: 12,
    checkDuplicate: true,
    validateReceipt: true,
    checkFailedStatus: true,
    amountTolerance: 1, // 1% tolerance
}, true);

// Add network clients
service.addNetworkClient('ethereum', 'YOUR_API_KEY');
service.addNetworkClient('bsc', 'YOUR_BSC_API_KEY');

// Verify payment
const result = await service.verifyPayment({
    txHash: '0x123...',
    network: 'ethereum',
    token: 'USDT',
    expectedRecipient: '0xAdminWallet...',
    expectedAmount: 100,
    minConfirmations: 12,
    userId: 'user123',
});

// Check result
if (result.valid) {
    console.log('Payment confirmed!', result.amountFormatted);
} else {
    console.log('Verification failed:', result.status, result.error);
}

// Set up event handlers
service.onConfirmed((result) => {
    console.log('Payment confirmed:', result.txHash);
    // Update user balance, send notification, etc.
});

service.onFailed((result) => {
    console.log('Payment failed:', result.txHash, result.error);
});

// Get audit logs
const logs = service.getAuditLogs({
    userId: 'user123',
    startDate: new Date('2024-01-01'),
});
```

### 3. Access Control System

Plan-based access control for managing user tiers and API limits.

**File**: `src/lib/etherscan-access.ts`

```typescript
import { getAccessController, hasFeature, checkApiAccess } from '@/lib/etherscan-access';

// Get controller instance
const controller = getAccessController();

// Set user plan (e.g., after payment)
controller.setUserPlan('user123', 'pro', new Date('2024-12-31'));

// Check feature access
const canUseWebhooks = controller.canUseWebhook('user123');
// Result: { allowed: true, reason: undefined }

const canBulkVerify = controller.canUseBulkVerification('user123');
// Result: { allowed: false, reason: 'Bulk verification not available on Free/Basic/Pro plans' }

// Check API call access
const apiAccess = controller.canMakeApiCall('user123');
if (!apiAccess.allowed) {
    console.log('Rate limit exceeded:', apiAccess.reason);
    return;
}

// Add wallet to user
const addResult = controller.addWallet('user123', '0xWalletAddress...');
// Result: { allowed: true, remaining: 9, limit: 10 }

// Get usage metrics
const metrics = controller.getUsageMetrics('user123');
console.log('API calls used:', metrics.apiCallsUsed, '/', metrics.apiCallsLimit);

// Get accessible networks
const networks = controller.getAccessibleNetworks('user123');
// Result: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism']
```

---

## API Routes

### 1. Verify Transaction

**Endpoint**: `POST /api/etherscan/verify`

```bash
curl -X POST http://localhost:3000/api/etherscan/verify \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0x1234567890abcdef1234567890abcdef12345678",
    "network": "ethereum",
    "token": "USDT",
    "expectedRecipient": "0xAdminWallet...",
    "expectedAmount": 100,
    "minConfirmations": 12,
    "userId": "user123"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "status": "confirmed",
    "txHash": "0x123...",
    "network": "ethereum",
    "token": "USDT",
    "sender": "0xSender...",
    "recipient": "0xAdminWallet...",
    "amount": "100000000",
    "amountFormatted": "100.000000",
    "confirmations": 15,
    "blockNumber": 12345678,
    "isFinalized": true
  },
  "message": "Payment verified successfully"
}
```

### 2. Get Balance

**Endpoint**: `POST /api/etherscan/balance`

```bash
curl -X POST http://localhost:3000/api/etherscan/balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xWalletAddress...",
    "network": "ethereum"
  }'
```

### 3. Check Confirmations

**Endpoint**: `GET /api/etherscan/verify?txHash=0x...&network=ethereum`

---

## Plan-Based Access Control

### Plan Tiers

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| Monthly API Calls | 1,000 | 5,000 | 25,000 | Unlimited |
| Max Wallets | 1 | 3 | 10 | Unlimited |
| Real-time Notifications | ❌ | ❌ | ✅ | ✅ |
| Webhook Support | ❌ | ❌ | ✅ | ✅ |
| Bulk Verification | ❌ | ❌ | ❌ | ✅ |
| Custom Endpoints | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |
| Max Confirmations | 12 | 12 | 19 | 19 |
| Rate Limit/sec | 1 | 3 | 10 | 50 |
| Networks | ETH, BSC | + Polygon | + Arbitrum, Optimism | All |

### Access Control Example

```typescript
// Check if user can access feature
import { hasFeature } from '@/lib/etherscan-access';

if (!hasFeature(userId, 'Real-time notifications')) {
    return { error: 'Upgrade to Pro plan for this feature' };
}

// Check API rate limit
import { checkApiAccess } from '@/lib/etherscan-access';

const access = checkApiAccess(userId);
if (!access.allowed) {
    return { error: access.reason, remaining: 0 };
}
```

---

## Webhook System

### Setting Up Webhooks

```typescript
import { createWebhookManager, createWebhookSender } from '@/lib/etherscan-webhook';

// Create webhook manager
const manager = createWebhookManager();

// Register a webhook
manager.registerWebhook('payment-webhook', {
    url: 'https://your-server.com/webhooks/payments',
    secret: 'your-webhook-secret',
    events: ['payment.confirmed', 'payment.failed', 'payment.duplicate'],
    retryPolicy: {
        maxRetries: 3,
        retryDelay: 5000,
        exponentialBackoff: true,
    },
    enabled: true,
});

// Send event to all webhooks
await manager.broadcastEvent('payment.confirmed', verificationResult);
```

### Webhook Payload

```json
{
  "event": "payment.confirmed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "txHash": "0x123...",
    "network": "ethereum",
    "status": "confirmed",
    "amount": "100000000",
    "amountFormatted": "100.000000",
    "sender": "0xSender...",
    "recipient": "0xRecipient...",
    "confirmations": 15,
    "blockNumber": 12345678,
    "timestamp": 1705315800,
    "userId": "user123"
  }
}
```

### Webhook Signature Verification

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

---

## Usage Examples

### Frontend: Auto-Verify Payment

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AutoVerifyPaymentProps {
    amount: number;
    expectedRecipient: string;
    network?: string;
    token?: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export function AutoVerifyPayment({
    amount,
    expectedRecipient,
    network = 'ethereum',
    token = 'USDT',
    onSuccess,
    onError,
}: AutoVerifyPaymentProps) {
    const [txHash, setTxHash] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [status, setStatus] = useState<'idle' | 'verifying' | 'confirmed' | 'failed'>('idle');

    const handleVerify = async () => {
        if (!txHash) {
            onError('Please enter transaction hash');
            return;
        }

        setIsVerifying(true);
        setStatus('verifying');

        try {
            const response = await fetch('/api/etherscan/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash,
                    network,
                    token,
                    expectedRecipient,
                    expectedAmount: amount,
                }),
            });

            const result = await response.json();

            if (result.success && result.data.valid) {
                setStatus('confirmed');
                onSuccess();
            } else {
                setStatus('failed');
                onError(result.error || 'Verification failed');
            }
        } catch (error: any) {
            setStatus('failed');
            onError(error.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="space-y-4">
            <Input
                placeholder="Enter transaction hash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
            />
            <Button onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Verify Payment'}
            </Button>
            {status === 'confirmed' && (
                <p className="text-green-500">Payment verified successfully!</p>
            )}
            {status === 'failed' && (
                <p className="text-red-500">Verification failed</p>
            )}
        </div>
    );
}
```

### Backend: Batch Verification

```typescript
// Example: Process multiple transactions
async function processTransactionBatch(txHashes: string[], network: string) {
    const service = createPaymentVerificationService(process.env.ETHERSCAN_API_KEY!);
    
    const results = await Promise.all(
        txHashes.map(txHash => 
            service.verifyPayment({
                txHash,
                network: network as BlockchainNetwork,
                token: 'USDT',
            })
        )
    );

    // Process results
    for (const result of results) {
        if (result.valid) {
            // Credit user balance
            await creditUserBalance(result.metadata?.userId, result.amountFormatted);
        }
    }

    return results;
}
```

### Admin: Monitor Wallet

```tsx
"use client";

import { useEffect, useState } from "react";

export function WalletMonitor({ walletAddress }: { walletAddress: string }) {
    const [balance, setBalance] = useState<string>('0');
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        // Poll balance every 30 seconds
        const interval = setInterval(async () => {
            const response = await fetch('/api/etherscan/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: walletAddress,
                    network: 'ethereum',
                }),
            });
            const result = await response.json();
            setBalance(result.data.balance);
        }, 30000);

        return () => clearInterval(interval);
    }, [walletAddress]);

    return (
        <div>
            <h2>Wallet Balance: {balance} ETH</h2>
        </div>
    );
}
```

---

## Environment Variables

```bash
# Etherscan API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISM_ETHERSCAN_API_KEY=your_optimism_api_key

# Admin Configuration
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x...

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret

# Verification Settings
NEXT_PUBLIC_MIN_CONFIRMATIONS=12
```

---

## Security Best Practices

### 1. API Key Security

- Store API keys in environment variables
- Use separate API keys for different networks
- Rotate API keys periodically
- Use API key permissions appropriately

### 2. Transaction Validation

```typescript
// Always validate these before processing
const validations = {
    checkHash: isValidTxHash(txHash),
    checkRecipient: toLowerCase(tx.to) === toLowerCase(expectedRecipient),
    checkAmount: Math.abs(parseFloat(tx.value) - expectedAmount) <= tolerance,
    checkConfirmations: confirmations >= minConfirmations,
    checkStatus: !tx.isError,
};
```

### 3. Duplicate Detection

```typescript
// Use the built-in duplicate detection
const service = createPaymentVerificationService(apiKey, {
    checkDuplicate: true, // Enabled by default
});

// Check if transaction was already processed
if (service.isDuplicate(txHash)) {
    throw new Error('Duplicate transaction detected');
}
```

### 4. Audit Logging

```typescript
// Enable audit logging
const service = createPaymentVerificationService(apiKey, {}, true);

// Access logs
const logs = service.getAuditLogs({
    userId: 'user123',
    startDate: new Date('2024-01-01'),
    endDate: new Date(),
});

// Export logs for compliance
console.log(JSON.stringify(logs, null, 2));
```

### 5. Rate Limiting

The client includes built-in rate limiting. Configure it based on your API plan:

```typescript
const client = createEtherscanClient(apiKey, 'ethereum', {
    rateLimit: 5, // requests per second
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000,
});
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| INVALID_API_KEY | API key is missing or invalid |
| RATE_LIMIT_EXCEEDED | Too many requests |
| NETWORK_ERROR | Blockchain API unavailable |
| TRANSACTION_NOT_FOUND | Transaction doesn't exist |
| INSUFFICIENT_CONFIRMATIONS | Not enough confirmations |
| INVALID_RECIPIENT | Wrong recipient address |
| INVALID_AMOUNT | Amount doesn't match |
| DUPLICATE_TRANSACTION | Already processed |
| TRANSACTION_FAILED | Transaction reverted |

### Try-Catch Example

```typescript
try {
    const result = await service.verifyPayment(request);
} catch (error: any) {
    if (error.message.includes('rate limit')) {
        // Wait and retry
        await sleep(5000);
        return retryVerification(request);
    }
    if (error.message.includes('not found')) {
        // Transaction might be pending
        return { status: 'pending' };
    }
    // Log error
    console.error('Verification error:', error);
    throw error;
}
```

---

## Testing

### Test with Local Blockchain

```bash
# Start local hardhat node
npx hardhat node

# Deploy test contracts
npx hardhat run scripts/deploy.ts --network localhost

# Test verification
curl -X POST http://localhost:3000/api/etherscan/verify \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0x...",
    "network": "ethereum",
    "token": "USDT"
  }'
```

### Test with Sepolia Testnet

```typescript
// Use Sepolia network for testing
const client = createEtherscanClient(testApiKey, 'ethereum');
// Note: Etherscan testnet uses different endpoints
```

---

## Support

For issues with the Etherscan API integration:

1. Check browser/server console for errors
2. Verify API keys are valid and have sufficient permissions
3. Ensure network configuration matches the correct chain
4. Check rate limits and adjust accordingly
5. Review audit logs for detailed error information

---

## Future Enhancements

- Multi-signature wallet support
- Automated withdrawal processing
- Additional token support (ERC-721, ERC-1155)
- Price feed integration
- Advanced analytics dashboard
- Mobile app integration
- Real-time push notifications

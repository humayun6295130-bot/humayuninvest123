# Payment Migration - TRON to BEP20 (BSC) Complete Guide

## Overview

This document describes the complete migration from TRON (TRC20) to BEP20 (BNB Smart Chain) for the payment system.

---

## 1. Payment Migration (BEP20 & Etherscan V2)

### Changes Made

#### 1.1 Updated `src/lib/payment-system.ts`
- Changed default network from `trc20` to `bep20`
- Updated `verifyTransaction()` to use Etherscan API V2 instead of TRON API
- Now verifies transactions on BSC (ChainID: 56)

#### 1.2 Updated `src/lib/wallet-config.ts`
- Added `USDT_CONTRACT_BSC` for USDT token contract on BSC
- Added `chain_id: 56` configuration
- Updated wallet info to show BEP20 exclusively
- Removed deprecated ERC20 and BTC addresses

```typescript
// New configuration
export const USDT_CONTRACT_BSC = '0x55d398326f99059fF775485246999027B319E5C';
export const WALLET_ADDRESSES = {
    chain_id: 56,
    network_name: 'BNB Smart Chain',
    currency_symbol: 'USDT',
};
```

#### 1.3 Etherscan API V2 Integration
The verification system already uses Etherscan API V2:
- Endpoint: `/api/etherscan/verify`
- Network: BSC (ChainID: 56)
- Token: USDT (BEP20)
- Required confirmations: 12

#### 1.4 BEP20 Address Validation
Existing endpoint: `/api/bep20/validate-address`

Client-side validation (src/lib/bep20.ts):
```typescript
export function isValidBEP20Address(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    // Must start with 0x and be exactly 42 characters
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
```

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/etherscan/verify` | POST | Verify transaction via Etherscan |
| `/api/etherscan/balance` | POST | Get wallet balance |
| `/api/bep20/validate-address` | GET | Validate BSC address format |

---

## 2. Advanced Multi-Tier Referral Engine

### New File: `src/lib/tier-referral-system.ts`

#### Commission Structure
| Level | Description | Commission |
|-------|-------------|------------|
| Level 1 | Direct referrer | 10% |
| Level 2 | Upline of Level 1 | 5% |
| Level 3 | Upline of Level 2 | 2% |

#### Example Calculation
For a $100 deposit:
- Level 1: $100 × 10% = $10
- Level 2: $100 × 5% = $5
- Level 3: $100 × 2% = $2
- **Total**: $17

#### Key Functions

```typescript
// Calculate commissions
import { calculateTierCommissions } from '@/lib/tier-referral-system';

const commissions = calculateTierCommissions(100);
// Result: [{ level: 1, percent: 10, amount: 10 }, { level: 2, percent: 5, amount: 5 }, { level: 3, percent: 2, amount: 2 }]

// Process commissions after deposit
import { processTierReferralCommissions } from '@/lib/tier-referral-system';

await processTierReferralCommissions(
    userId,        // User who made deposit
    depositAmount, // Amount deposited
    txHash        // Transaction hash
);
```

#### Database Schema

The `referral_history` collection should have:
```javascript
{
    id: string,              // Auto-generated
    referrer_id: string,     // User who receives commission
    user_id: string,        // The depositor
    level: 1 | 2 | 3,       // Commission level
    commission_amount: number,
    deposit_amount: number,
    transaction_hash: string,
    created_at: string      // ISO timestamp
}
```

#### Parent/Referrer Setup

Users table needs `parent_id` field:
```javascript
{
    // ... other fields
    parent_id: string,      // Immediate referrer
    referrer_id: string,    // Also supported (legacy)
}
```

---

## 3. Withdrawal & Credential Vault

### 3.1 BEP20 Wallet Storage

Use users document fields: `bep20_wallet_address`, `bep20_wallet_verified`, `bep20_wallet_added_at` (same as Settings UI).

### 3.2 User Settings API

**Endpoint**: `/api/user/settings/wallet`

| Method | Description |
|--------|-------------|
| POST | Save wallet address |
| GET | Get saved address |
| DELETE | Remove saved address |

Request headers required: `x-user-id`

### 3.3 Withdrawal Flow

1. User requests withdrawal
2. System checks `bep20_wallet_address` on the user profile
3. Auto-fills wallet address field if saved
4. User can override with manual entry
5. Admin approves/rejects
6. Email notification sent

### 3.4 Manual Approval Workflow

States: `pending` → `approved` → `completed` (or `rejected`)

**Admin Endpoints**:
- `/api/admin/withdrawals` - List pending
- `/api/admin/withdrawals/[action]` - Approve/Reject/Complete

### 3.5 Email Notifications

Notifications sent for:
- Withdrawal approved
- Withdrawal rejected (with reason)

---

## 4. Integration Guide

### 4.1 Deposit Verification Flow

```typescript
// 1. User submits transaction hash
const result = await fetch('/api/etherscan/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        txHash: '0x...',
        network: 'bsc',
        token: 'USDT',
        expectedRecipient: ADMIN_WALLET_ADDRESS,
        expectedAmount: 100,
    })
});

// 2. If verified, process referral commissions
if (result.data.valid) {
    await processTierReferralCommissions(
        userId,
        result.data.amountFormatted,
        txHash
    );
}
```

### 4.2 Auto-Fill Withdrawal Form

```typescript
// Get saved wallet address
const idToken = await auth.currentUser?.getIdToken();
const response = await fetch('/api/user/settings/wallet', {
    headers: { Authorization: `Bearer ${idToken}` }
});
const { data } = await response.json();
const walletAddress = data?.walletAddress ?? '';

// Pre-fill form
<Input defaultValue={walletAddress} placeholder="Wallet address" />
```

---

## 5. Database Schema Updates

### Users Collection
Add these fields:
```javascript
{
    // Existing fields...
    
    // Referral
    parent_id: string,           // Immediate referrer
    referral_id: string,         // Legacy support
    
    // Wallet Credential
    saved_bep20_address: string, // Saved BEP20 wallet
    
    // Updated at
    updated_at: string,
}
```

### New Collection: referral_history
```javascript
{
    id: string,
    referrer_id: string,
    user_id: string,
    level: 1 | 2 | 3,
    commission_amount: number,
    deposit_amount: number,
    transaction_hash: string,
    created_at: string
}
```

---

## 6. Environment Variables

Required:
```bash
# Etherscan API (required for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Admin wallet (USDT BEP20)
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x...
```

Optional:
```bash
# BSC Scan API (for higher rate limits)
BSCSCAN_API_KEY=your_bscscan_api_key
```

---

## 7. API Rate Limits

| Plan | Calls/Day | Calls/Second |
|------|-----------|--------------|
| Free | 1,000 | 1 |
| Basic | 5,000 | 3 |
| Pro | 25,000 | 10 |
| Enterprise | Unlimited | 50 |

---

## 8. Error Codes

| Code | Message |
|------|---------|
| INVALID_HASH | Invalid transaction hash format |
| INVALID_ADDRESS | Invalid BEP20 address |
| TX_NOT_FOUND | Transaction not found |
| TX_FAILED | Transaction failed on blockchain |
| INSUFFICIENT_CONFIRMATIONS | Transaction not fully confirmed |
| AMOUNT_MISMATCH | Amount does not match expected |
| WRONG_RECIPIENT | Transaction sent to wrong address |
| DUPLICATE_TX | Transaction already processed |

---

## 9. Testing

### Test Deposit Verification

```bash
# Test with a real transaction
curl -X POST http://localhost:3000/api/etherscan/verify \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0x1234567890abcdef1234567890abcdef12345678",
    "network": "bsc",
    "token": "USDT"
  }'
```

### Test Address Validation

```bash
curl "http://localhost:3000/api/bep20/validate-address?address=0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
```

---

## 10. Migration Checklist

- [x] Update payment-system.ts network defaults
- [x] Update wallet-config.ts for BSC
- [x] Update verifyTransaction to use Etherscan
- [x] Create tier-referral-system.ts
- [x] Add parent_id to users
- [x] Create referral_history collection
- [x] Create user settings wallet API
- [x] Set up email notifications
- [x] Update frontend payment components
- [x] Test all integrations

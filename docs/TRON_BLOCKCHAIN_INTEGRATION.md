# TRON Blockchain Integration Documentation

## Overview

This document describes the TRON blockchain integration features implemented in the investment platform. The integration provides automatic payment verification, real-time wallet monitoring, and enhanced security features.

## Features

### 1. Automatic Payment Verification (স্বয়ংক্রিয় পেমেন্ট ভেরিফিকেশন)

**File**: `src/components/payment/auto-verify-payment.tsx`

Automatically verifies USDT transactions on the TRON blockchain using the transaction ID (TxID).

**Features**:
- Validates transaction format (64-character hex string)
- Verifies transaction exists on TRON blockchain
- Confirms recipient address matches admin wallet
- Validates payment amount matches expected value
- Tracks confirmation count (minimum 19 confirmations required)
- Auto-updates user balance upon verification

**Usage**:
```tsx
import { AutoVerifyPayment } from '@/components/payment/auto-verify-payment';

<AutoVerifyPayment
  amount={100}
  purpose="deposit"
  onSuccess={() => console.log('Payment verified!')}
/>
```

### 2. USDT Amount Confirmation (অ্যামাউন্ট কনফার্মেশন)

**File**: `src/lib/tron.ts` - `verifyUSDTTransfer()`

Confirms the exact USDT amount sent by the customer and automatically adds it to their balance.

**API Endpoint**: `POST /api/tron/verify`

```json
{
  "txID": "abc123...",
  "expectedToAddress": "TXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
  "expectedAmount": 100
}
```

### 3. Confirmation Status Tracking (কনফার্মেশন স্ট্যাটাস)

**File**: `src/hooks/use-tron.ts` - `useConfirmationTracker()`

Tracks transaction confirmation status in real-time:
- Monitors confirmation count
- Requires minimum 19 confirmations for full verification
- Auto-updates UI as confirmations increase
- Triggers callback when sufficient confirmations received

**Visual Indicator**:
- Progress bar showing confirmations (e.g., 5/19)
- Color-coded status badges
- Real-time polling every 10 seconds

### 4. Double Spending Prevention (ডাবল স্পেন্ডিং চেক)

**File**: `src/lib/tron.ts`

Prevents the same transaction from being used multiple times:
- Maintains processed transaction cache
- Checks if TxID was previously used
- Rejects duplicate transaction attempts
- Records all processed transactions

**Hook**: `useDoubleSpendCheck()`

### 5. Real-Time Wallet Balance Monitoring (রিয়েল-টাইম ব্যালেন্স)

**File**: `src/components/admin/admin-wallet-monitor.tsx`

Admin dashboard component for monitoring wallet:
- Real-time USDT balance display
- TRX balance for network fees
- All TRC-20 token balances
- Incoming/outgoing transaction history
- Auto-refresh every 30 seconds

**Features**:
- Balance cards with live updates
- Transaction history tabs
- Token details view
- Deposit notifications

### 6. Address Validator (অ্যাড্রেস ভ্যালিডেটর)

**File**: `src/components/wallet/withdraw-dialog-enhanced.tsx`

Validates TRON wallet addresses before withdrawal:
- Format validation (starts with 'T', 34 characters)
- Real-time validation as user types
- Visual feedback (green check / red X)
- API endpoint: `GET /api/tron/validate-address`

### 7. Network Fee Calculator (নেটওয়ার্ক ফি ক্যালকুলেটর)

**File**: `src/lib/tron.ts` - `calculateTransactionFee()`

Calculates network fees before transaction:
- Bandwidth requirements
- Energy requirements
- Estimated TRX fee
- Account resource check

**API Endpoint**: `POST /api/tron/fee`

```json
{
  "fromAddress": "T...",
  "toAddress": "T...",
  "amount": 100
}
```

### 8. Smart Contract Event Tracking (স্মার্ট কন্ট্রাক্ট ইভেন্ট)

**File**: `src/lib/tron.ts` - `getUSDTTransferEvents()`

Tracks USDT transfer events from the smart contract:
- Filters Transfer events
- Configurable time range
- Pagination support

**API Endpoint**: `GET /api/tron/events`

### 9. Investment Statistics & Analytics (রিপোর্ট ও অ্যানালিটিক্স)

**File**: `src/components/admin/investment-stats-chart.tsx`

Admin dashboard charts and statistics:
- Daily investment bar/line charts
- Transaction distribution pie chart
- Statistics cards (total deposits, investments, users)
- Date range filtering (7, 30, 90 days, all time)

### 10. User Deposit Logs (ইউজার ডিপোজিট লগ)

**File**: `src/components/admin/user-deposit-logs.tsx`

Complete deposit history with:
- Search by user, email, TxID
- Filter by status (verified, pending, failed)
- Export to CSV
- Detailed view with confirmations
- Blockchain verification status

## API Routes

### `/api/tron/verify` (POST)
Verify a USDT transaction on the blockchain.

### `/api/tron/balance` (GET)
Get wallet balance for a TRON address.

### `/api/tron/transactions` (GET)
Get transaction history for an address.

### `/api/tron/validate-address` (GET)
Validate a TRON address format.

### `/api/tron/fee` (POST/GET)
Calculate network fees or get fee information.

### `/api/tron/events` (GET)
Get USDT smart contract transfer events.

## Environment Variables

```bash
# TRONGRID API Key
NEXT_PUBLIC_TRONGRID_API_KEY=your_api_key_here

# Admin Wallet Address (TRC-20 USDT)
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=TXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV

# Minimum Confirmations (default: 19)
NEXT_PUBLIC_MIN_CONFIRMATIONS=19
```

## Constants

- **USDT Contract**: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- **TRONGRID API**: `https://api.trongrid.io`
- **Block Explorer**: `https://tronscan.org`

## React Hooks

### `useTransactionVerification()`
Hook for verifying transactions.

### `useDoubleSpendCheck()`
Hook for checking double-spending.

### `useWalletBalance()`
Hook for real-time wallet balance.

### `useTransactionHistory()`
Hook for transaction history.

### `useFeeCalculator()`
Hook for calculating network fees.

### `useAddressValidator()`
Hook for validating addresses.

### `useConfirmationTracker()`
Hook for tracking confirmations.

## Security Features

1. **Transaction Verification**: All payments verified on blockchain
2. **Double Spending Prevention**: Same TxID cannot be reused
3. **Address Validation**: Withdrawal addresses validated
4. **Confirmation Requirements**: Minimum 19 confirmations required
5. **Real-time Monitoring**: Admin wallet monitored continuously

## Usage Examples

### For Users - Making a Deposit

1. User clicks "Deposit"
2. System displays admin wallet address
3. User sends USDT to the address
4. User enters TxID in the verification form
5. System automatically verifies on blockchain
6. Balance updated upon sufficient confirmations

### For Admin - Monitoring Wallet

1. Navigate to Admin Dashboard
2. View "Admin Wallet Monitor" component
3. See real-time balance and transactions
4. Get notifications for new deposits
5. Track all user deposits in deposit logs

### For Withdrawals

1. User enters withdrawal address
2. System validates address format
3. User enters amount
4. System calculates network fee
5. User confirms withdrawal
6. Request submitted for admin approval

## Error Handling

All components include proper error handling:
- Invalid transaction hashes
- Network errors
- Insufficient confirmations
- Invalid addresses
- API failures

## Testing

Test the integration using:
- Testnet: Available via TRONGRID
- Mainnet: Use with caution
- Example TxID: Use real TRON transactions from Tronscan

## Support

For issues with the TRON blockchain integration:
1. Check browser console for errors
2. Verify API key is valid
3. Ensure admin wallet address is correct
4. Check network connectivity to TRONGRID

## Future Enhancements

- Multi-signature wallet support
- Automated withdrawals
- Additional TRC-20 tokens
- Price feed integration
- Advanced analytics

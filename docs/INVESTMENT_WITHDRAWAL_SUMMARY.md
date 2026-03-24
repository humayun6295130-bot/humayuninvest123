# Investment Withdrawal System - Summary

## Configuration ✅

### Minimum Withdrawal: $50
```typescript
// In payment-system.ts and investment-withdrawal.ts
minWithdrawalAmount: 50
```

### Profit Calculation by Level

| Level | Investment Range | Daily Profit % | Example ($500) |
|-------|------------------|----------------|----------------|
| 1 - Starter | $30-$250 | 1.5% | $7.50/day |
| 2 - Silver | $251-$500 | 2.0% | $10.00/day |
| 3 - Gold | $501-$1000 | 2.5% | $12.50/day |
| 4 - Platinum | $1001-$2500 | 3.1% | $15.50/day |
| 5 - Diamond | $5000-$10000 | 4.0% | $20.00/day |

## Key Rules ✅

### 1. Minimum Withdrawal: $50
- Enforced in both `payment-system.ts` and `investment-withdrawal.ts`
- Returns error if amount < 50

### 2. Deposit Display in Wallet (Visible but Locked)
- `total_deposits` shown in balance for visibility
- Cannot be withdrawn - marked as `locked`
- Only profit is `withdrawable`

### 3. Profit Calculation Based on Deposit Level
- Uses `getLevelByAmount(depositAmount)` from `level-config.ts`
- Daily profit = `depositAmount * level.dailyIncomePercent / 100`
- Example: $500 deposit at Level 2 (2%) = $10/day profit

### 4. Principal Locked - Only Profit Withdrawable
- `lockPrincipal: true` - Principal deposits cannot be withdrawn
- `allowProfitWithdrawal: true` - Only profit is withdrawable
- Principal withdrawal request always returns error: "Principal deposits are locked"

## Files Created/Modified

### New Files:
1. **`src/lib/investment-withdrawal.ts`**
   - Profit withdrawal logic
   - `createProfitWithdrawal()` - Creates profit-only withdrawal
   - `createPrincipalWithdrawal()` - Always fails (principal locked)
   - `calculateDepositProfit()` - Calculates profit by level

2. **`src/app/api/investment/withdraw/route.ts`**
   - User profit withdrawal endpoint
   - GET for balance info
   - POST for withdrawal request

3. **`src/app/api/admin/investment/withdrawals/route.ts`**
   - Admin approve/reject/complete endpoints

### Modified Files:
1. **`src/lib/payment-system.ts`**
   - Added `lockPrincipal: true`
   - Added `allowProfitWithdrawal: true`
   - Changed minWithdrawalAmount to 50

## API Usage

### User: Create Profit Withdrawal
```bash
POST /api/investment/withdraw
{
  "amount": 100,
  "walletAddress": "Txxx...",
  "network": "trc20"
}
```

### User: Check Balance & Limits
```bash
GET /api/investment/withdraw?userId=xxx
```

### Admin: Approve Withdrawal
```bash
POST /api/admin/investment/withdrawals?action=approve
{
  "withdrawalId": "xxx",
  "notes": "Approved"
}
```

## Verification Checklist ✅

| Feature | Status | Implementation |
|---------|--------|----------------|
| Minimum $50 threshold | ✅ | `DEFAULT_SECURITY_CONFIG.minWithdrawalAmount = 50` |
| Deposit shown in wallet | ✅ | `balance.total_deposits` displayed |
| Deposit locked (not withdrawable) | ✅ | `createPrincipalWithdrawal()` always fails |
| Profit calculated by level | ✅ | `calculateDepositProfit(depositAmount, level)` |
| Only profit withdrawable | ✅ | `createProfitWithdrawal()` with type `profit_withdrawal` |
| Admin workflow | ✅ | approve/reject/complete endpoints |

## Example Flow

1. User deposits $500 (Level 2 - 2% daily)
2. System calculates: $10/day profit
3. Profit accumulates in `total_profit`
4. User requests $100 withdrawal
5. System validates: amount >= $50 ✅
6. System checks: amount <= profit balance ✅
7. Withdrawal request created (type: profit_withdrawal)
8. Admin approves → status: approved → completed
9. User receives $100 (minus 8% fee = $92 net)

## Security Features ✅
- Minimum withdrawal: $50
- Maximum withdrawal: $10,000/day
- Daily limit: $50,000
- Principal locked (cannot withdraw deposit)
- Fraud detection for suspicious amounts
- Full audit trail for all admin actions

# BTCMine / AscendFolio — Investment Platform

## Overview
A Next.js 15 investment platform for BTC mining investments. Users invest USDT (BEP-20 on BSC), earn daily ROI, refer friends for 5-level commissions, and withdraw profits. Firebase (Firestore + Auth + Storage) is the backend. Premium black UI (`#050505`) with orange/gold accents.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Blockchain**: BSC/BEP-20 USDT via Etherscan API (BSC mainnet)
- **Package Manager**: npm

## Project Structure
- `src/app/` — Next.js App Router pages and API routes
- `src/app/(app)/` — Authenticated pages (dashboard, invest, mining, referrals, wallet)
- `src/app/(auth)/` — Auth pages (login, register)
- `src/components/` — Reusable UI components
- `src/firebase/` — Firebase config, provider, hooks
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utility functions including referral system
- `src/app/api/` — Next.js API routes (Etherscan verify/balance)

## Running the App
```bash
npm run dev    # Development server on port 5000
npm run build  # Production build
npm run start  # Production server on port 5000
```

## Environment Variables
Set in `.env.local` (short names mapped via `next.config.ts`):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x1ce43c19F785Bf51294519F54004842939149e0A
ETHERSCAN_API_KEY=W3PB77NKBCSQAFQHTCAZWN6HY3N67IUQ4D
NEXT_PUBLIC_BASE_URL
```
Short names (`apiKey`, `projectId`, etc.) are also mapped in `next.config.ts`'s `env` block for compatibility.

## Replit Configuration
- Dev server runs on port 5000 with `0.0.0.0` host binding
- Workflow: "Start application" runs `npm run dev`
- `allowedDevOrigins` set to specific Replit domains in `next.config.ts`

## Admin
- Email `humayunlbb@gmail.com` gets admin role automatically (hardcoded in auth logic)
- Admin wallet: `0x1ce43c19F785Bf51294519F54004842939149e0A`
- Admin panel at `/admin`

## Key Features & Architecture

### Daily Claim System
- **File**: `src/components/wallet/claim-daily-dialog.tsx`
- Auto-calculates claimable amount from all active investments' `daily_roi` field
- Once per day globally (checks `last_daily_claim` on user profile — ISO date, UTC split)
- Firebase `writeBatch`: atomically updates `balance`, each investment's `last_claim_date`, and creates a transaction record
- Shows countdown timer if already claimed today; shows amount breakdown per investment

### Referral System (5-level)
- **Files**: `src/lib/referral-system.ts`, `src/app/(app)/referrals/page.tsx`
- Defaults: 5% / 3% / 2% / 1% / 1% (stored in Firestore `referral_settings` collection)
- `awardCommission()` fires on investment approval in `src/components/admin/investment-approval.tsx`
- Credits referrer's `referral_balance` AND `referral_earnings`
- Withdrawal: immediately deducts from `referral_balance`, creates pending record in `referral_withdrawals`
- Referral link format: `<base_url>/register?ref=<referral_code>`

### Payment Verification (Etherscan/BSC)
- **API routes**: `src/app/api/etherscan/verify/route.ts`, `src/app/api/etherscan/balance/route.ts`
- Verifies BEP-20 USDT transfers on BSC network
- Admin wallet receives payments; deposits auto-verified by checking Etherscan transaction history

### Wallet Page
- **File**: `src/app/(app)/wallet/page.tsx`
- 3-card balance summary: Main Balance / Referral Balance / Total Invested
- Color-coded transaction history with proper type labels
- Daily claim via `ClaimDailyDialog` component

### Mining Page
- **File**: `src/app/(app)/mining/page.tsx`
- Shows active investments as mining rigs
- Stuck Reserves feature (lock for higher rates)
- Live hash rate animation (Math.random only inside useEffect intervals)

## Hydration Rules (CRITICAL)
All date/number formatting MUST be locale-explicit to avoid SSR/client mismatch:
- `toLocaleString()` → `toLocaleString('en-US')`
- `toLocaleDateString()` → `toLocaleDateString('en-US')`
- `toLocaleTimeString()` → `toLocaleTimeString('en-US')`
- `format(date, 'PP')` → `format(date, 'MMM dd, yyyy')`
- `format(date, 'p')` → `format(date, 'HH:mm')`
- `format(date, 'PPpp')` → `format(date, 'MMM dd, yyyy HH:mm')`
- Math.random() in render → ONLY inside useEffect
- Particles/dynamic elements → guard with `mounted` state from `useEffect`

## Firebase Data Model
### users collection
- `balance` — main withdrawable balance (USDT)
- `referral_balance` — available referral earnings
- `referral_earnings` — all-time referral total
- `last_daily_claim` — ISO timestamp of last daily claim
- `referral_code` — unique code (REFxxxxxx)
- `referred_by` — uid of referrer

### investments collection
- `daily_roi` — daily return amount in USDT
- `last_claim_date` — date of last daily claim
- `status` — 'active' | 'pending' | 'completed'
- `amount` — invested USDT amount

### referral_settings (global config)
- `level1_percent` through `level5_percent` — commission rates
- `min_withdrawal` — minimum referral withdrawal amount

### referral_withdrawals collection
- Pending records created when user requests referral payout
- Admin approves/rejects via admin panel

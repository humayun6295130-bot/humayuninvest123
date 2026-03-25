# AscendFolio / BTCMine - Investment Platform

## Overview
A Next.js 15 investment platform that allows users to invest, track earnings, manage referrals, and perform USDT (BEP-20) blockchain transactions. Built with Firebase as the backend (Firestore + Auth + Storage). Features a premium black UI design with gold/orange accents.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage, Realtime DB)
- **Blockchain**: TRON/TRC-20 USDT verification via TronGrid API
- **Package Manager**: npm

## Project Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/app/(app)/` - Authenticated app pages (dashboard, invest, referrals, etc.)
- `src/app/(auth)/` - Auth pages (login, register)
- `src/components/` - Reusable UI components
- `src/firebase/` - Firebase config, hooks, and database helpers
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions including referral system
- `src/ai/` - Genkit AI integrations (optional)
- `*.cjs` - Admin/setup Node.js scripts (run manually)

## Running the App
```bash
npm run dev    # Development server on port 5000
npm run build  # Production build
npm run start  # Production server on port 5000
```

## Required Environment Variables
All Firebase env vars must be set (see `.env.example` for full list):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_TRONGRID_API_KEY
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
NEXT_PUBLIC_BASE_URL
```

## Replit Configuration
- Dev server runs on port 5000 with `0.0.0.0` host binding (required for Replit preview)
- Workflow: "Start application" runs `npm run dev`
- Migrated from Vercel — port changed from 9002 to 5000, Turbopack removed for stability

## Referral System
### How It Works
1. User gets a unique referral code (`REFxxxxxx`) on registration
2. Share link format: `<base_url>/register?ref=<code>`
3. When referred user registers, `processNewReferral()` is called creating the referral chain
4. Commission is distributed via `awardCommission()` when investments are approved

### Commission Distribution Points
- **Admin investment approval**: `src/components/admin/investment-approval.tsx`
- **Blockchain auto-verify**: `src/components/payment/auto-verify-payment.tsx`
- **Daily cron**: `daily-earnings-cron.cjs` (run manually or via scheduled job)

### Commission Flow
- `awardCommission()` in `src/lib/referral-system.ts` updates:
  - `referral_earnings` (all-time total)
  - `referral_balance` (available to withdraw)
- `validateReferralCode()` searches by both `referral_code` and `username` fields

### Fixed Bugs (Production Ready)
- Referral balance bug: `awardCommission` now updates `referral_balance` (not just `referral_earnings`)
- Referral validation: now searches by `referral_code` field first, falls back to `username`
- Commission rates display: fixed field names (`level1_percent` not `level1`)
- Commission distribution: added to investment approval and blockchain auto-verify flows

## Mobile Improvements
- Viewport meta tag added (`width=device-width, initial-scale=1`)
- Referral page: share buttons use responsive grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-5`)
- Referral link input: removed fixed `min-w-[300px]`, now full width on mobile
- Level tabs: flex-wrap layout for 6 level tabs on small screens
- Referral list items: truncate-safe layout with `min-w-0` and `shrink-0`

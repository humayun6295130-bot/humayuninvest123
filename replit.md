# AscendFolio - Investment Platform

## Overview
A Next.js 15 investment platform that allows users to invest, track earnings, manage referrals, and perform USDT (TRC-20) blockchain transactions. Built with Firebase as the backend (Firestore + Auth + Storage).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage, Realtime DB)
- **Blockchain**: TRON/TRC-20 USDT verification via TronGrid API
- **Package Manager**: npm

## Project Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable UI components
- `src/firebase/` - Firebase config, hooks, and database helpers
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions
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

# Professional Investment Platform Architecture

## Current Features Analysis

### Existing Features:
- User Authentication (Firebase Auth)
- Dashboard with basic stats
- Portfolio management (manual asset entry)
- Wallet (deposit, withdraw, daily claim)
- Basic investment plans (Starter/Growth/Professional)
- Admin panel (user management, transaction approval)
- Content/Market Insights

### Missing Features for Professional Platform:

## 1. USER PANEL FEATURES

### A. Profile Management
- **Profile Page** (`/profile`)
  - View/Edit personal info
  - Change password
  - Two-factor authentication (2FA)
  - Email verification status
  - Account security settings

### B. Investment Plans (Enhanced)
- **Plans Page** (`/invest`)
  - View all available plans
  - ROI calculator
  - Plan comparison table
  - Purchase investment plan
  - Track active investments
  - Auto-compound option

### C. Earnings & Returns
- **Earnings Page** (`/earnings`)
  - Daily returns breakdown
  - Cumulative earnings chart
  - Withdraw earnings
  - Reinvest earnings

### D. Referral System
- **Referrals Page** (`/referrals`)
  - Unique referral link
  - Referral statistics (total, active, earnings)
  - Referral levels/tiers
  - Commission history

### E. Transaction History
- **Transactions Page** (`/transactions`)
  - All transactions filterable by type
  - Deposit history
  - Withdrawal history
  - Investment history
  - Export to PDF/CSV

### F. KYC Verification
- **KYC Page** (`/kyc`)
  - Document upload (ID, Passport, Address proof)
  - KYC status tracking
  - Verification progress

### G. Support System
- **Support Page** (`/support`)
  - Create support tickets
  - View ticket history
  - Live chat option
  - FAQ section

### H. Notifications
- **Notifications Center**
  - In-app notifications
  - Email notifications
  - Push notifications
  - Notification preferences

---

## 2. ADMIN PANEL FEATURES

### A. Dashboard
- Platform statistics overview
- Total users, investments, deposits
- Recent activities
- Revenue charts

### B. User Management
- View all users
- Edit user details
- Block/unblock users
- View user portfolios
- Manage user KYC

### C. Investment Management
- Create/Edit investment plans
- View all active investments
- Manage ROI rates
- Investment reports

### D. Transaction Management
- View all transactions
- Approve/Reject deposits
- Process withdrawals
- Transaction reports

### E. Content Management
- Create/Edit market insights
- Manage FAQs
- Announcements

### F. Support Management
- View all tickets
- Assign tickets to agents
- Ticket analytics

### G. Settings
- Platform settings
- Email templates
- Commission rates
- Withdrawal limits

---

## 3. FIREBASE COLLECTIONS SCHEMA

### users (existing - enhanced)
```
{
  id: string,
  email: string,
  username: string,
  display_name: string,
  role: 'user' | 'admin',
  balance: number,
  active_plan: string,
  daily_claim_amount: number,
  is_public: boolean,
  bio: string,
  profile_picture_url: string,
  currency_preference: string,
  status: 'active' | 'suspended' | 'banned',
  created_at: timestamp,
  // New fields
  referral_code: string,
  referred_by: string,
  total_earned: number,
  total_withdrawn: number,
  total_deposited: number,
  kyc_status: 'pending' | 'verified' | 'rejected',
  email_verified: boolean,
  two_factor_enabled: boolean,
}
```

### investment_plans (new)
```
{
  id: string,
  name: string,
  description: string,
  min_amount: number,
  max_amount: number,
  daily_roi_percent: number,
  duration_days: number,
  capital_return: boolean,
  is_active: boolean,
  created_at: timestamp,
}
```

### user_investments (new)
```
{
  id: string,
  user_id: string,
  plan_id: string,
  plan_name: string,
  amount: number,
  daily_roi: number,
  total_return: number,
  earned_so_far: number,
  start_date: timestamp,
  end_date: timestamp,
  status: 'active' | 'completed' | 'cancelled',
  auto_compound: boolean,
  last_payout: timestamp,
  created_at: timestamp,
}
```

### referrals (new)
```
{
  id: string,
  referrer_id: string,
  referred_id: string,
  referred_email: string,
  level: number,
  commission_percent: number,
  total_commission: number,
  status: 'active' | 'inactive',
  created_at: timestamp,
}
```

### kyc_documents (new)
```
{
  id: string,
  user_id: string,
  document_type: 'passport' | 'id_card' | 'driving_license',
  document_number: string,
  front_image_url: string,
  back_image_url: string,
  selfie_url: string,
  status: 'pending' | 'under_review' | 'approved' | 'rejected',
  rejection_reason: string,
  submitted_at: timestamp,
  reviewed_at: timestamp,
}
```

### support_tickets (new)
```
{
  id: string,
  user_id: string,
  user_email: string,
  subject: string,
  category: 'deposit' | 'withdrawal' | 'investment' | 'technical' | 'other',
  message: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  priority: 'low' | 'medium' | 'high',
  assigned_to: string,
  responses: [
    {
      from: 'user' | 'support',
      message: string,
      created_at: timestamp,
    }
  ],
  created_at: timestamp,
  updated_at: timestamp,
}
```

### notifications (new)
```
{
  id: string,
  user_id: string,
  title: string,
  message: string,
  type: 'investment' | 'withdrawal' | 'deposit' | 'system' | 'referral',
  is_read: boolean,
  created_at: timestamp,
}
```

### daily_earnings (new)
```
{
  id: string,
  user_id: string,
  investment_id: string,
  amount: number,
  date: string,
  status: 'credited' | 'pending',
  created_at: timestamp,
}
```

---

## 4. IMPLEMENTATION ROADMAP

### Phase 1: Core User Features
1. Enhanced User Profile Page
2. Investment Plans Purchase Flow
3. Earnings Page
4. Enhanced Transaction History

### Phase 2: Referral & Social
1. Referral System
2. Referral Dashboard

### Phase 3: Trust & Security
1. KYC Verification Flow
2. Email Verification
3. 2FA Setup

### Phase 4: Support & Communication
1. Support Ticket System
2. Notifications Center
3. FAQ Section

### Phase 5: Admin Features
1. Investment Plan Management
2. KYC Management
3. Support Ticket Management
4. Platform Analytics

---

## 5. NEW PAGE STRUCTURE

```
src/app/(app)/
├── dashboard/page.tsx
├── portfolio/page.tsx
├── wallet/page.tsx
├── invest/
│   └── page.tsx (investment plans)
├── earnings/
│   └── page.tsx
├── transactions/
│   └── page.tsx
├── referrals/
│   └── page.tsx
├── profile/
│   └── page.tsx
├── kyc/
│   └── page.tsx
├── support/
│   └── page.tsx
├── notifications/
│   └── page.tsx
├── content/page.tsx
└── settings/page.tsx
```

## 6. NAVIGATION UPDATES

Main navigation add:
- Invest (Investment Plans)
- Earnings
- Transactions
- Referrals
- Support
- Notifications (with badge)

---

**Next:** Approve this plan and I'll start implementing Phase 1 features.

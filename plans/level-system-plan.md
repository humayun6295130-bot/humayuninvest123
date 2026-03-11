# Level-Based Investment System Plan

## Overview
Implement a complete level-based investment system with auto-level upgrade, daily profit calculation, and team commission in profile section.

## Level Structure

| Level | Balance Range | Daily Income % |
|-------|---------------|----------------|
| 1     | $30 - $250    | 1.5%          |
| 2     | $251 - $500   | 2.0%          |
| 3     | $501 - $1000  | 2.5%          |
| 4     | $1001 - $5000 | 3.1%          |
| 5     | $5001 - $10000| 4.0%          |

## Tasks

### Phase 1: Database & Data Structure
- [ ] Create script to initialize level system fields for all users
- [ ] Add new fields to user profiles: current_level, income_percent, daily_earnings_log
- [ ] Set up team_commissions collection for tracking commission history

### Phase 2: Profile Page Updates
- [ ] Add Level Badge showing current level with color coding
- [ ] Add Progress Bar showing distance to next level
- [ ] Add Daily Profit Calculator component
- [ ] Add Team Commission section with total and history

### Phase 3: Auto-Level System
- [ ] Create function to auto-calculate level based on balance
- [ ] Update level when balance changes (deposit/withdraw)
- [ ] Add notification when level changes

### Phase 4: Daily Earnings System
- [ ] Create cron job script for daily earnings calculation
- [ ] Calculate daily earnings based on current level's percentage
- [ ] Add earnings to user balance and log daily earnings

## Implementation Details

### User Profile Fields to Add
```
- current_level: number (1-5)
- income_percent: number (based on level)
- total_team_commission: number
- last_daily_earning_date: string
```

### Team Commission Collection
```
- id: string
- user_id: string (who receives commission)
- from_user_id: string (who generated commission)
- amount: number
- level: number (1, 2, 3)
- created_at: string
```

### Daily Earnings Log Collection
```
- id: string
- user_id: string
- amount: number
- balance_before: number
- balance_after: number
- income_percent: number
- date: string
- created_at: string
```

## UI Components

### Profile Page Layout
1. **Header**: Name, Email, Level Badge
2. **Balance Card**: Current balance with level indicator
3. **Progress Section**: Progress bar to next level
4. **Daily Calculator**: Input amount, show daily/weekly/monthly earnings
5. **Team Commission**: Total commission with breakdown

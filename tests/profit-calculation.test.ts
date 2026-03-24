/**
 * Comprehensive Test Suite: Daily Profit Calculation
 * 
 * Tests cover:
 * - Profit calculation by investment level
 * - Daily/Weekly/Monthly earnings
 * - Edge cases and error handling
 */

import {
    getLevelByAmount,
    getLevelByNumber,
    calculateDailyIncome,
    calculateDailyEarnings,
    calculateWeeklyEarnings,
    calculateMonthlyEarnings,
    getUserLevel,
    getLevelInfo,
    getNextLevel,
    INVESTMENT_LEVELS,
} from '@/lib/level-config';

// ============================================================================
// TEST: Level Configuration
// ============================================================================

describe('Investment Level Configuration', () => {

    test('should have 5 investment levels', () => {
        expect(INVESTMENT_LEVELS).toHaveLength(5);
    });

    test('Level 1 (Starter) should have correct values', () => {
        const level = getLevelByNumber(1);

        expect(level?.name).toBe('Starter');
        expect(level?.minInvestment).toBe(30);
        expect(level?.maxInvestment).toBe(250);
        expect(level?.dailyIncomePercent).toBe(1.5);
    });

    test('Level 2 (Silver) should have correct values', () => {
        const level = getLevelByNumber(2);

        expect(level?.name).toBe('Silver');
        expect(level?.minInvestment).toBe(251);
        expect(level?.maxInvestment).toBe(500);
        expect(level?.dailyIncomePercent).toBe(2.0);
    });

    test('Level 3 (Gold) should have correct values', () => {
        const level = getLevelByNumber(3);

        expect(level?.name).toBe('Gold');
        expect(level?.minInvestment).toBe(501);
        expect(level?.maxInvestment).toBe(1000);
        expect(level?.dailyIncomePercent).toBe(2.5);
    });

    test('Level 4 (Platinum) should have correct values', () => {
        const level = getLevelByNumber(4);

        expect(level?.name).toBe('Platinum');
        expect(level?.minInvestment).toBe(1001);
        expect(level?.maxInvestment).toBe(2500);
        expect(level?.dailyIncomePercent).toBe(3.1);
    });

    test('Level 5 (Diamond) should have correct values', () => {
        const level = getLevelByNumber(5);

        expect(level?.name).toBe('Diamond');
        expect(level?.minInvestment).toBe(5000);
        expect(level?.maxInvestment).toBe(10000);
        expect(level?.dailyIncomePercent).toBe(4.0);
    });
});

// ============================================================================
// TEST: Daily Profit Calculation
// ============================================================================

describe('Daily Profit Calculation', () => {

    test('should calculate correct daily income for Starter ($100)', () => {
        const income = calculateDailyIncome(100);

        // 100 * 1.5% = 1.5
        expect(income).toBe(1.5);
    });

    test('should calculate correct daily income for Silver ($300)', () => {
        const income = calculateDailyIncome(300);

        // 300 * 2.0% = 6.0
        expect(income).toBe(6.0);
    });

    test('should calculate correct daily income for Gold ($750)', () => {
        const income = calculateDailyIncome(750);

        // 750 * 2.5% = 18.75
        expect(income).toBe(18.75);
    });

    test('should calculate correct daily income for Platinum ($2000)', () => {
        const income = calculateDailyIncome(2000);

        // 2000 * 3.1% = 62.0
        expect(income).toBe(62.0);
    });

    test('should calculate correct daily income for Diamond ($7500)', () => {
        const income = calculateDailyIncome(7500);

        // 7500 * 4.0% = 300
        expect(income).toBe(300);
    });

    test('should return 0 for $0 investment', () => {
        const income = calculateDailyIncome(0);
        expect(income).toBe(0);
    });

    test('should return 0 for amounts below minimum', () => {
        const income = calculateDailyIncome(10);
        expect(income).toBe(0);
    });
});

// ============================================================================
// TEST: Weekly Profit Calculation
// ============================================================================

describe('Weekly Profit Calculation', () => {

    test('should calculate weekly earnings correctly', () => {
        const weekly = calculateWeeklyEarnings(100);

        // Daily: 1.5 * 7 = 10.5
        expect(weekly).toBe(10.5);
    });

    test('should handle $0 weekly', () => {
        const weekly = calculateWeeklyEarnings(0);
        expect(weekly).toBe(0);
    });
});

// ============================================================================
// TEST: Monthly Profit Calculation
// ============================================================================

describe('Monthly Profit Calculation', () => {

    test('should calculate monthly earnings correctly', () => {
        const monthly = calculateMonthlyEarnings(100);

        // Daily: 1.5 * 30 = 45
        expect(monthly).toBe(45);
    });

    test('should handle $0 monthly', () => {
        const monthly = calculateMonthlyEarnings(0);
        expect(monthly).toBe(0);
    });
});

// ============================================================================
// TEST: Level Detection
// ============================================================================

describe('Level Detection', () => {

    test('should detect Starter level for $100', () => {
        const level = getLevelByAmount(100);

        expect(level?.name).toBe('Starter');
        expect(level?.level).toBe(1);
    });

    test('should detect Silver level for $300', () => {
        const level = getLevelByAmount(300);

        expect(level?.name).toBe('Silver');
        expect(level?.level).toBe(2);
    });

    test('should detect Gold level for $750', () => {
        const level = getLevelByAmount(750);

        expect(level?.name).toBe('Gold');
        expect(level?.level).toBe(3);
    });

    test('should detect Platinum level for $2000', () => {
        const level = getLevelByAmount(2000);

        expect(level?.name).toBe('Platinum');
        expect(level?.level).toBe(4);
    });

    test('should detect Diamond level for $7500', () => {
        const level = getLevelByAmount(7500);

        expect(level?.name).toBe('Diamond');
        expect(level?.level).toBe(5);
    });

    test('should return undefined for amount below minimum', () => {
        const level = getLevelByAmount(10);
        expect(level).toBeUndefined();
    });
});

// ============================================================================
// TEST: Next Level Calculation
// ============================================================================

describe('Next Level Calculation', () => {

    test('should get next level from Starter to Silver', () => {
        const next = getNextLevel(100);

        expect(next?.name).toBe('Silver');
        expect(next?.level).toBe(2);
    });

    test('should get next level from Silver to Gold', () => {
        const next = getNextLevel(300);

        expect(next?.name).toBe('Gold');
        expect(next?.level).toBe(3);
    });

    test('should return null for Diamond (max level)', () => {
        const next = getNextLevel(7500);

        expect(next).toBeNull();
    });
});

// ============================================================================
// TEST: User Level Aliases
// ============================================================================

describe('User Level Functions', () => {

    test('getUserLevel should work correctly', () => {
        const level = getUserLevel(500);

        expect(level.name).toBe('Gold');
    });

    test('getLevelInfo should be alias for getUserLevel', () => {
        const level1 = getUserLevel(500);
        const level2 = getLevelInfo(500);

        expect(level1).toEqual(level2);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Profit Calculation Edge Cases', () => {

    test('should handle boundary: $30 (min Starter)', () => {
        const income = calculateDailyIncome(30);

        // 30 * 1.5% = 0.45
        expect(income).toBe(0.45);
    });

    test('should handle boundary: $250 (max Starter)', () => {
        const income = calculateDailyIncome(250);

        // 250 * 1.5% = 3.75
        expect(income).toBe(3.75);
    });

    test('should handle boundary: $251 (min Silver)', () => {
        const income = calculateDailyIncome(251);

        // 251 * 2.0% = 5.02
        expect(income).toBe(5.02);
    });

    test('should handle boundary: $5000 (min Diamond)', () => {
        const income = calculateDailyIncome(5000);

        // 5000 * 4.0% = 200
        expect(income).toBe(200);
    });

    test('should handle large amounts', () => {
        const income = calculateDailyIncome(100000);

        expect(income).toBeGreaterThan(0);
    });

    test('should handle decimal amounts', () => {
        const income = calculateDailyIncome(150.50);

        expect(income).toBeGreaterThan(0);
    });
});

// ============================================================================
// INTEGRATION: Full Investment Flow
// ============================================================================

describe('Full Investment Profit Flow', () => {

    test('should calculate complete profit journey', () => {
        // User invests $500 (Gold level)
        const investment = 500;

        // Get their level
        const level = getLevelByAmount(investment);
        expect(level?.name).toBe('Gold');
        expect(level?.dailyIncomePercent).toBe(2.5);

        // Calculate daily profit
        const daily = calculateDailyIncome(investment);
        expect(daily).toBe(12.5); // 500 * 2.5%

        // Calculate weekly
        const weekly = calculateWeeklyEarnings(investment);
        expect(weekly).toBe(87.5); // 12.5 * 7

        // Calculate monthly
        const monthly = calculateMonthlyEarnings(investment);
        expect(monthly).toBe(375); // 12.5 * 30
    });
});

console.log('✅ Daily Profit Calculation Tests Complete');

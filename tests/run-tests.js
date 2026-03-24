/**
 * Simple Test Runner - Direct Function Execution
 * Run with: node tests/run-tests.js
 */

// ============================================================================
// TEST: Referral Commission Calculation
// ============================================================================

const TIER_REFERRAL_COMMISSION = {
    level1: 10,
    level2: 5,
    level3: 2,
};

function calculateTierCommissions(depositAmount) {
    const level1Amount = depositAmount * (TIER_REFERRAL_COMMISSION.level1 / 100);
    const level2Amount = depositAmount * (TIER_REFERRAL_COMMISSION.level2 / 100);
    const level3Amount = depositAmount * (TIER_REFERRAL_COMMISSION.level3 / 100);

    return [
        { level: 1, percent: TIER_REFERRAL_COMMISSION.level1, amount: parseFloat(level1Amount.toFixed(2)) },
        { level: 2, percent: TIER_REFERRAL_COMMISSION.level2, amount: parseFloat(level2Amount.toFixed(2)) },
        { level: 3, percent: TIER_REFERRAL_COMMISSION.level3, amount: parseFloat(level3Amount.toFixed(2)) }
    ];
}

// Test Results
const testResults = [];

function test(name, fn) {
    try {
        fn();
        testResults.push({ name, passed: true });
        console.log(`✅ ${name}`);
    } catch (error) {
        testResults.push({ name, passed: false, error: error.message });
        console.log(`❌ ${name}: ${error.message}`);
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
    }
}

console.log('\n========================================');
console.log('TESTING: Referral Commission Calculation');
console.log('========================================\n');

test('should calculate 10%, 5%, 2% for $100 deposit', () => {
    const commissions = calculateTierCommissions(100);
    assertEqual(commissions[0].amount, 10, 'Level 1');
    assertEqual(commissions[1].amount, 5, 'Level 2');
    assertEqual(commissions[2].amount, 2, 'Level 3');
});

test('should calculate correct commissions for $500 deposit', () => {
    const commissions = calculateTierCommissions(500);
    assertEqual(commissions[0].amount, 50);
    assertEqual(commissions[1].amount, 25);
    assertEqual(commissions[2].amount, 10);
});

test('should calculate correct commissions for $1000 deposit', () => {
    const commissions = calculateTierCommissions(1000);
    assertEqual(commissions[0].amount, 100);
    assertEqual(commissions[1].amount, 50);
    assertEqual(commissions[2].amount, 20);
});

test('should round to 2 decimal places', () => {
    const commissions = calculateTierCommissions(33.33);
    assertEqual(commissions[0].amount, 3.33);
    assertEqual(commissions[1].amount, 1.67);
    assertEqual(commissions[2].amount, 0.67);
});

test('should handle $0 deposit', () => {
    const commissions = calculateTierCommissions(0);
    assertEqual(commissions[0].amount, 0);
    assertEqual(commissions[1].amount, 0);
    assertEqual(commissions[2].amount, 0);
});

test('should handle large deposits', () => {
    const commissions = calculateTierCommissions(100000);
    assertEqual(commissions[0].amount, 10000);
    assertEqual(commissions[1].amount, 5000);
    assertEqual(commissions[2].amount, 2000);
});

test('Total commission should be 17%', () => {
    const total = TIER_REFERRAL_COMMISSION.level1 + TIER_REFERRAL_COMMISSION.level2 + TIER_REFERRAL_COMMISSION.level3;
    assertEqual(total, 17);
});

// ============================================================================
// TEST: Daily Profit Calculation
// ============================================================================

const INVESTMENT_LEVELS = [
    { level: 1, name: "Starter", minInvestment: 30, maxInvestment: 250, dailyIncomePercent: 1.5 },
    { level: 2, name: "Silver", minInvestment: 251, maxInvestment: 500, dailyIncomePercent: 2.0 },
    { level: 3, name: "Gold", minInvestment: 501, maxInvestment: 1000, dailyIncomePercent: 2.5 },
    { level: 4, name: "Platinum", minInvestment: 1001, maxInvestment: 2500, dailyIncomePercent: 3.1 },
    { level: 5, name: "Diamond", minInvestment: 5000, maxInvestment: 10000, dailyIncomePercent: 4.0 },
];

function getLevelByAmount(amount) {
    return INVESTMENT_LEVELS.find(level => amount >= level.minInvestment && amount <= level.maxInvestment);
}

function calculateDailyIncome(amount) {
    const level = getLevelByAmount(amount);
    if (!level) return 0;
    return (amount * level.dailyIncomePercent) / 100;
}

function calculateWeeklyEarnings(amount) {
    return calculateDailyIncome(amount) * 7;
}

function calculateMonthlyEarnings(amount) {
    return calculateDailyIncome(amount) * 30;
}

console.log('\n========================================');
console.log('TESTING: Daily Profit Calculation');
console.log('========================================\n');

test('should calculate correct daily income for Starter ($100)', () => {
    assertEqual(calculateDailyIncome(100), 1.5);
});

test('should calculate correct daily income for Silver ($300)', () => {
    assertEqual(calculateDailyIncome(300), 6.0);
});

test('should calculate correct daily income for Gold ($750)', () => {
    assertEqual(calculateDailyIncome(750), 18.75);
});

test('should calculate correct daily income for Platinum ($2000)', () => {
    assertEqual(calculateDailyIncome(2000), 62.0);
});

test('should calculate correct daily income for Diamond ($7500)', () => {
    assertEqual(calculateDailyIncome(7500), 300);
});

test('should return 0 for $0 investment', () => {
    assertEqual(calculateDailyIncome(0), 0);
});

test('should return 0 for amounts below minimum', () => {
    assertEqual(calculateDailyIncome(10), 0);
});

test('should calculate weekly earnings correctly', () => {
    assertEqual(calculateWeeklyEarnings(100), 10.5);
});

test('should calculate monthly earnings correctly', () => {
    assertEqual(calculateMonthlyEarnings(100), 45);
});

// ============================================================================
// TEST: Withdrawal Validation
// ============================================================================

const DEFAULT_SECURITY_CONFIG = {
    minWithdrawalAmount: 50,
    maxWithdrawalAmount: 10000,
    dailyWithdrawalLimit: 50000,
    weeklyWithdrawalLimit: 200000,
    monthlyWithdrawalLimit: 500000,
};

const WITHDRAWAL_FEE_PERCENTAGE = 8;

function validateWithdrawal(amount, balance) {
    const errors = [];

    if (amount < DEFAULT_SECURITY_CONFIG.minWithdrawalAmount) {
        errors.push(`Minimum withdrawal is $${DEFAULT_SECURITY_CONFIG.minWithdrawalAmount}`);
    }

    if (amount > DEFAULT_SECURITY_CONFIG.maxWithdrawalAmount) {
        errors.push(`Maximum withdrawal is $${DEFAULT_SECURITY_CONFIG.maxWithdrawalAmount}`);
    }

    if (amount > balance) {
        errors.push('Insufficient balance');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function calculateWithdrawalFee(amount) {
    return amount * (WITHDRAWAL_FEE_PERCENTAGE / 100);
}

function calculateNetWithdrawal(amount) {
    const fee = calculateWithdrawalFee(amount);
    return amount - fee;
}

console.log('\n========================================');
console.log('TESTING: Withdrawal Validation');
console.log('========================================\n');

test('should reject withdrawal below minimum', () => {
    const result = validateWithdrawal(10, 1000);
    assertEqual(result.valid, false);
});

test('should accept valid withdrawal', () => {
    const result = validateWithdrawal(100, 1000);
    assertEqual(result.valid, true);
});

test('should reject withdrawal exceeding balance', () => {
    const result = validateWithdrawal(500, 100);
    assertEqual(result.valid, false);
});

test('should reject withdrawal above maximum', () => {
    const result = validateWithdrawal(20000, 50000);
    assertEqual(result.valid, false);
});

test('should calculate withdrawal fee correctly', () => {
    assertEqual(calculateWithdrawalFee(100), 8);
});

test('should calculate net withdrawal correctly', () => {
    assertEqual(calculateNetWithdrawal(100), 92);
});

// ============================================================================
// TEST: BEP20 Address Validation
// ============================================================================

function isValidBEP20Address(address) {
    if (!address || typeof address !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

console.log('\n========================================');
console.log('TESTING: BEP20 Address Validation');
console.log('========================================\n');

test('should validate correct BEP20 address', () => {
    assertEqual(isValidBEP20Address('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'), true);
});

test('should reject address without 0x prefix', () => {
    assertEqual(isValidBEP20Address('742d35Cc6634C0532925a3b844Bc454e4438f44e'), false);
});

test('should reject address shorter than 42 chars', () => {
    assertEqual(isValidBEP20Address('0x742d35Cc6634C0532925a3b844Bc454e4438f44'), false);
});

test('should reject address longer than 42 chars', () => {
    assertEqual(isValidBEP20Address('0x742d35Cc6634C0532925a3b844Bc454e4438f44e00'), false);
});

test('should reject empty address', () => {
    assertEqual(isValidBEP20Address(''), false);
});

test('should reject null address', () => {
    assertEqual(isValidBEP20Address(null), false);
});

// ============================================================================
// TEST: Transaction Hash Validation
// ============================================================================

function isValidTxHash(txHash) {
    if (!txHash || typeof txHash !== 'string') return false;
    return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

console.log('\n========================================');
console.log('TESTING: Transaction Hash Validation');
console.log('========================================\n');

test('should validate correct transaction hash', () => {
    const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    assertEqual(isValidTxHash(validHash), true);
});

test('should reject hash without 0x prefix', () => {
    const hashWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    assertEqual(isValidTxHash(hashWithoutPrefix), false);
});

test('should reject hash shorter than 64 chars', () => {
    assertEqual(isValidTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef'), false);
});

// ============================================================================
// TEST: Admin Approval Workflow
// ============================================================================

const WITHDRAWAL_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

function processWithdrawalAction(currentStatus, action, adminNotes) {
    const validTransitions = {
        pending: ['approve', 'reject'],
        approved: ['complete', 'reject'],
        rejected: [],
        completed: [],
        failed: []
    };

    const allowedActions = validTransitions[currentStatus] || [];

    if (!allowedActions.includes(action)) {
        return {
            success: false,
            error: `Cannot ${action} withdrawal with status ${currentStatus}`
        };
    }

    let newStatus;
    switch (action) {
        case 'approve':
            newStatus = WITHDRAWAL_STATUS.APPROVED;
            break;
        case 'reject':
            newStatus = WITHDRAWAL_STATUS.REJECTED;
            break;
        case 'complete':
            newStatus = WITHDRAWAL_STATUS.COMPLETED;
            break;
        default:
            return { success: false, error: 'Invalid action' };
    }

    return {
        success: true,
        previousStatus: currentStatus,
        newStatus,
        adminNotes,
        processedAt: new Date().toISOString()
    };
}

console.log('\n========================================');
console.log('TESTING: Admin Approval Workflow');
console.log('========================================\n');

test('should approve pending withdrawal', () => {
    const result = processWithdrawalAction('pending', 'approve', 'Approved for processing');
    assertEqual(result.success, true);
    assertEqual(result.newStatus, 'approved');
});

test('should reject pending withdrawal', () => {
    const result = processWithdrawalAction('pending', 'reject', 'Insufficient documentation');
    assertEqual(result.success, true);
    assertEqual(result.newStatus, 'rejected');
});

test('should complete approved withdrawal', () => {
    const result = processWithdrawalAction('approved', 'complete', 'Funds sent successfully');
    assertEqual(result.success, true);
    assertEqual(result.newStatus, 'completed');
});

test('should reject already approved withdrawal', () => {
    const result = processWithdrawalAction('approved', 'approve', 'Try again');
    assertEqual(result.success, false);
});

test('should not allow action on rejected withdrawal', () => {
    const result = processWithdrawalAction('rejected', 'approve', 'Cannot reverse');
    assertEqual(result.success, false);
});

test('should not allow action on completed withdrawal', () => {
    const result = processWithdrawalAction('completed', 'reject', 'Already done');
    assertEqual(result.success, false);
});

test('should return error message for invalid transition', () => {
    const result = processWithdrawalAction('pending', 'complete', 'Invalid');
    assertEqual(result.success, false);
    assertEqual(result.error.includes('Cannot complete'), true);
});

// ============================================================================
// TEST: Daily Profit Claim
// ============================================================================

const LEVEL_PROFIT_RATES = {
    1: 1.5,  // Starter
    2: 2.0,  // Silver
    3: 2.5,  // Gold
    4: 3.1,  // Platinum
    5: 4.0   // Diamond
};

function calculateAndClaimDailyProfit(user) {
    const { totalDeposits, level, lastClaimedAt } = user;

    if (totalDeposits <= 0) {
        return { success: false, error: 'No active deposits' };
    }

    const dailyRate = LEVEL_PROFIT_RATES[level] || 1.5;
    const dailyProfit = (totalDeposits * dailyRate) / 100;

    // Check if 24 hours since last claim
    if (lastClaimedAt) {
        const hoursSinceLastClaim = (Date.now() - new Date(lastClaimedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim < 24) {
            return {
                success: false,
                error: `Can only claim once per 24 hours. Next claim in ${Math.round(24 - hoursSinceLastClaim)} hours`
            };
        }
    }

    return {
        success: true,
        amount: dailyProfit,
        newBalance: user.balance + dailyProfit,
        claimedAt: new Date().toISOString()
    };
}

console.log('\n========================================');
console.log('TESTING: Daily Profit Claim');
console.log('========================================\n');

test('should calculate daily profit for Level 1', () => {
    const user = { totalDeposits: 100, level: 1, lastClaimedAt: null };
    const result = calculateAndClaimDailyProfit(user);
    assertEqual(result.success, true);
    assertEqual(result.amount, 1.5);
});

test('should calculate daily profit for Level 3', () => {
    const user = { totalDeposits: 750, level: 3, lastClaimedAt: null };
    const result = calculateAndClaimDailyProfit(user);
    assertEqual(result.success, true);
    assertEqual(result.amount, 18.75);
});

test('should reject claim with no deposits', () => {
    const user = { totalDeposits: 0, level: 1, lastClaimedAt: null };
    const result = calculateAndClaimDailyProfit(user);
    assertEqual(result.success, false);
});

test('should reject claim within 24 hours', () => {
    const recentClaim = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago
    const user = { totalDeposits: 100, level: 1, lastClaimedAt: recentClaim };
    const result = calculateAndClaimDailyProfit(user);
    assertEqual(result.success, false);
    assertEqual(result.error.includes('24 hours'), true);
});

test('should allow claim after 24 hours', () => {
    const oldClaim = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
    const user = { totalDeposits: 100, level: 1, lastClaimedAt: oldClaim };
    const result = calculateAndClaimDailyProfit(user);
    assertEqual(result.success, true);
});

// ============================================================================
// TEST: Bonus Credit System
// ============================================================================

const BONUS_TYPES = {
    WELCOME: 'welcome',
    REFERRAL: 'referral',
    DEPOSIT: 'deposit',
    LOYALTY: 'loyalty',
    PROMO: 'promo'
};

const BONUS_REQUIREMENTS = {
    [BONUS_TYPES.WELCOME]: { minDeposit: 100, maxBonus: 50, percentage: 10 },
    [BONUS_TYPES.REFERRAL]: { minDeposit: 0, maxBonus: 100, percentage: 5 },
    [BONUS_TYPES.DEPOSIT]: { minDeposit: 500, maxBonus: 200, percentage: 3 },
    [BONUS_TYPES.LOYALTY]: { minDeposit: 0, maxBonus: 500, fixed: 10 },
    [BONUS_TYPES.PROMO]: { minDeposit: 0, maxBonus: 1000, percentage: 0 }
};

function calculateBonus(bonusType, depositAmount, userHasReceived = false) {
    const requirements = BONUS_REQUIREMENTS[bonusType];

    if (!requirements) {
        return { success: false, error: 'Invalid bonus type' };
    }

    // Check if user already received this bonus type
    if (userHasReceived && bonusType !== BONUS_TYPES.DEPOSIT) {
        return { success: false, error: 'Bonus already received' };
    }

    // Check minimum deposit
    if (depositAmount < requirements.minDeposit) {
        return { success: false, error: `Minimum deposit of ${requirements.minDeposit} required` };
    }

    let bonusAmount;
    if (requirements.fixed) {
        bonusAmount = requirements.fixed;
    } else {
        bonusAmount = depositAmount * (requirements.percentage / 100);
    }

    // Cap at max bonus
    bonusAmount = Math.min(bonusAmount, requirements.maxBonus);

    return {
        success: true,
        bonusType,
        bonusAmount: parseFloat(bonusAmount.toFixed(2)),
        requirements: requirements
    };
}

console.log('\n========================================');
console.log('TESTING: Bonus Credit System');
console.log('========================================\n');

test('should calculate welcome bonus correctly', () => {
    const result = calculateBonus(BONUS_TYPES.WELCOME, 100, false);
    assertEqual(result.success, true);
    assertEqual(result.bonusAmount, 10); // 10% of 100, capped at 50
});

test('should cap welcome bonus at max', () => {
    const result = calculateBonus(BONUS_TYPES.WELCOME, 1000, false);
    assertEqual(result.success, true);
    assertEqual(result.bonusAmount, 50); // Capped at 50
});

test('should reject bonus below minimum deposit', () => {
    const result = calculateBonus(BONUS_TYPES.WELCOME, 50, false);
    assertEqual(result.success, false);
});

test('should reject already received bonus', () => {
    const result = calculateBonus(BONUS_TYPES.WELCOME, 100, true);
    assertEqual(result.success, false);
});

test('should calculate referral bonus', () => {
    const result = calculateBonus(BONUS_TYPES.REFERRAL, 500, false);
    assertEqual(result.success, true);
    assertEqual(result.bonusAmount, 25); // 5% of 500
});

test('should calculate loyalty bonus', () => {
    const result = calculateBonus(BONUS_TYPES.LOYALTY, 0, false);
    assertEqual(result.success, true);
    assertEqual(result.bonusAmount, 10); // Fixed amount
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================\n');

const passed = testResults.filter(r => r.passed).length;
const failed = testResults.filter(r => !r.passed).length;

console.log(`Total Tests: ${testResults.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);

if (failed > 0) {
    console.log('\nFailed Tests:');
    testResults.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
}

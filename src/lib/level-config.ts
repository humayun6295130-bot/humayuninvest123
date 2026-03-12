/**
 * Investment Level Configuration
 * Each level has different investment range and income percentage
 */

export interface LevelConfig {
    level: number;
    name: string;
    minInvestment: number;
    maxInvestment: number;
    dailyIncomePercent: number;
    features: string[];
}

export const INVESTMENT_LEVELS: LevelConfig[] = [
    {
        level: 1,
        name: "Starter",
        minInvestment: 30,
        maxInvestment: 250,
        dailyIncomePercent: 1.5,
        features: [
            "Basic mining access",
            "Daily earnings",
            "Email support"
        ]
    },
    {
        level: 2,
        name: "Silver",
        minInvestment: 251,
        maxInvestment: 500,
        dailyIncomePercent: 2.0,
        features: [
            "Advanced mining access",
            "Daily earnings",
            "Priority support",
            "Bonus rewards"
        ]
    },
    {
        level: 3,
        name: "Gold",
        minInvestment: 501,
        maxInvestment: 1000,
        dailyIncomePercent: 2.5,
        features: [
            "Premium mining access",
            "Daily earnings",
            "24/7 support",
            "Higher bonus rewards",
            "Faster withdrawals"
        ]
    },
    {
        level: 4,
        name: "Platinum",
        minInvestment: 1001,
        maxInvestment: 2500,
        dailyIncomePercent: 3.1,
        features: [
            "Elite mining access",
            "Daily earnings",
            "VIP support",
            "Maximum bonus rewards",
            "Instant withdrawals",
            "Personal account manager"
        ]
    },
    {
        level: 5,
        name: "Diamond",
        minInvestment: 5000,
        maxInvestment: 10000,
        dailyIncomePercent: 4.0,
        features: [
            "Ultimate mining access",
            "Maximum daily earnings",
            "Dedicated support",
            "Maximum bonus rewards",
            "Instant withdrawals",
            "Personal account manager",
            "Exclusive events access"
        ]
    }
];

/**
 * Get level by investment amount
 */
export function getLevelByAmount(amount: number): LevelConfig | undefined {
    return INVESTMENT_LEVELS.find(
        level => amount >= level.minInvestment && amount <= level.maxInvestment
    );
}

/**
 * Get level by level number
 */
export function getLevelByNumber(level: number): LevelConfig | undefined {
    return INVESTMENT_LEVELS.find(l => l.level === level);
}

/**
 * Calculate daily income based on investment amount
 */
export function calculateDailyIncome(amount: number): number {
    const level = getLevelByAmount(amount);
    if (!level) return 0;
    return (amount * level.dailyIncomePercent) / 100;
}

/**
 * Get user level info based on total investment
 */
export function getUserLevel(totalInvested: number): LevelConfig {
    // Find the highest level the user qualifies for
    const levels = [...INVESTMENT_LEVELS].reverse(); // Start from highest
    return levels.find(level => totalInvested >= level.minInvestment) || INVESTMENT_LEVELS[0];
}

/**
 * Centralized Level Configuration
 * 
 * ⚠️ IMPORTANT: This configuration MUST match the LEVEL_CONFIG in daily-earnings-cron.cjs
 * If you update this file, you MUST also update the cron script to keep them in sync.
 * 
 * Level Structure:
 * Level 1: $30-$250 → 1.5% daily
 * Level 2: $251-$500 → 2.0% daily
 * Level 3: $501-$1000 → 2.5% daily
 * Level 4: $1001-$5000 → 3.1% daily
 * Level 5: $5001-$10000 → 4.0% daily
 */

export interface LevelConfig {
    level: number;
    min: number;
    max: number;
    income_percent: number;
    name: string;
    color: string;
}

export const LEVEL_CONFIG: LevelConfig[] = [
    { level: 1, min: 30, max: 250, income_percent: 1.5, name: 'Starter', color: 'bg-gray-500' },
    { level: 2, min: 251, max: 500, income_percent: 2.0, name: 'Basic', color: 'bg-blue-500' },
    { level: 3, min: 501, max: 1000, income_percent: 2.5, name: 'Silver', color: 'bg-slate-400' },
    { level: 4, min: 1001, max: 5000, income_percent: 3.1, name: 'Gold', color: 'bg-yellow-500' },
    { level: 5, min: 5001, max: 10000, income_percent: 4.0, name: 'VIP', color: 'bg-purple-500' }
];

/**
 * Get level info based on balance
 */
export function getLevelInfo(balance: number): LevelConfig {
    for (const config of LEVEL_CONFIG) {
        if (balance >= config.min && balance <= config.max) {
            return config;
        }
    }
    if (balance > 10000) return LEVEL_CONFIG[4];
    return LEVEL_CONFIG[0];
}

/**
 * Get next level based on current level number
 */
export function getNextLevel(currentLevel: number): LevelConfig | null {
    if (currentLevel >= 5) return null;
    return LEVEL_CONFIG[currentLevel];
}

/**
 * Calculate progress to next level (0-100)
 */
export function getProgressToNextLevel(currentBalance: number, currentLevel: number): number {
    const nextLevel = getNextLevel(currentLevel);
    if (!nextLevel) return 100;

    const currentLevelInfo = LEVEL_CONFIG.find(l => l.level === currentLevel) || LEVEL_CONFIG[0];
    if (currentBalance < currentLevelInfo.min) return 0;

    return ((currentBalance - currentLevelInfo.min) / (nextLevel.min - currentLevelInfo.min)) * 100;
}

/**
 * Calculate daily earnings based on balance
 */
export function calculateDailyEarnings(balance: number): number {
    const levelInfo = getLevelInfo(balance);
    return (balance * levelInfo.income_percent) / 100;
}

/**
 * Calculate weekly earnings based on balance
 */
export function calculateWeeklyEarnings(balance: number): number {
    return calculateDailyEarnings(balance) * 7;
}

/**
 * Calculate monthly earnings based on balance
 */
export function calculateMonthlyEarnings(balance: number): number {
    return calculateDailyEarnings(balance) * 30;
}

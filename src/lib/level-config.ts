/**
 * User-facing “investment levels” for dashboard/profile — derived from deposit tier table
 * so percentages and ranges always match claims + landing (see `deposit-income-tiers.ts`).
 */
import { DEPOSIT_INCOME_TIERS, resolveDailyIncomeForDeposit } from "./deposit-income-tiers";

export interface LevelConfig {
    level: number;
    name: string;
    minInvestment: number;
    maxInvestment: number;
    dailyIncomePercent: number;
    features: string[];
    color?: string;
    min: number;
    max: number;
    income_percent: number;
}

const TIER_PRESENTATION: {
    name: string;
    color: string;
    features: string[];
}[] = [
    {
        name: "Starter",
        color: "bg-blue-500",
        features: ["Basic mining access", "Daily earnings", "Email support"],
    },
    {
        name: "Silver",
        color: "bg-gray-400",
        features: ["Advanced mining access", "Daily earnings", "Priority support", "Bonus rewards"],
    },
    {
        name: "Gold",
        color: "bg-yellow-500",
        features: ["Premium mining access", "Daily earnings", "24/7 support", "Higher bonus rewards", "Faster withdrawals"],
    },
    {
        name: "Platinum",
        color: "bg-purple-500",
        features: ["Elite mining access", "Daily earnings", "VIP support", "Maximum bonus rewards", "Instant withdrawals", "Personal account manager"],
    },
    {
        name: "Diamond",
        color: "bg-cyan-500",
        features: [
            "Ultimate mining access",
            "Maximum daily earnings",
            "Dedicated support",
            "Maximum bonus rewards",
            "Instant withdrawals",
            "Personal account manager",
            "Exclusive events access",
        ],
    },
];

export const INVESTMENT_LEVELS: LevelConfig[] = DEPOSIT_INCOME_TIERS.map((t, i) => {
    const meta = TIER_PRESENTATION[i] ?? TIER_PRESENTATION[0];
    return {
        level: t.level,
        name: meta.name,
        minInvestment: t.min,
        maxInvestment: t.max,
        dailyIncomePercent: t.incomePercent,
        color: meta.color,
        min: t.min,
        max: t.max,
        income_percent: t.incomePercent,
        features: meta.features,
    };
});

export function getLevelByAmount(amount: number): LevelConfig | undefined {
    const a = Number(amount);
    if (!Number.isFinite(a)) return undefined;
    const last = INVESTMENT_LEVELS[INVESTMENT_LEVELS.length - 1];
    if (a > last.maxInvestment) {
        return last;
    }
    return INVESTMENT_LEVELS.find((level) => a >= level.minInvestment && a <= level.maxInvestment);
}

export function getLevelByNumber(level: number): LevelConfig | undefined {
    return INVESTMENT_LEVELS.find((l) => l.level === level);
}

export function calculateDailyIncome(amount: number): number {
    return resolveDailyIncomeForDeposit(amount).dailyUsd;
}

export function getUserLevel(totalInvested: number): LevelConfig {
    const levels = [...INVESTMENT_LEVELS].reverse();
    const level = levels.find((l) => totalInvested >= l.minInvestment) || INVESTMENT_LEVELS[0];
    return {
        ...level,
        min: level.minInvestment,
        max: level.maxInvestment,
        income_percent: level.dailyIncomePercent,
    };
}

export function getLevelInfo(totalInvested: number): LevelConfig {
    return getUserLevel(totalInvested);
}

export function getNextLevel(totalInvested: number): LevelConfig | null {
    const currentLevel = getUserLevel(totalInvested);
    if (currentLevel.level >= INVESTMENT_LEVELS.length) return null;
    const nextLevel = getLevelByNumber(currentLevel.level + 1);
    if (!nextLevel) return null;
    return {
        ...nextLevel,
        min: nextLevel.minInvestment,
        max: nextLevel.maxInvestment,
        income_percent: nextLevel.dailyIncomePercent,
    };
}

export function calculateDailyEarnings(amount: number): number {
    return calculateDailyIncome(amount);
}

export function calculateWeeklyEarnings(amount: number): number {
    return calculateDailyIncome(amount) * 7;
}

export function calculateMonthlyEarnings(amount: number): number {
    return calculateDailyIncome(amount) * 30;
}

export const LEVEL_CONFIG = INVESTMENT_LEVELS;

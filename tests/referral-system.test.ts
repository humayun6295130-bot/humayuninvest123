/**
 * Referral tier math (`calculateTierCommissions`) — aligned with `DEFAULT_REFERRAL_SETTINGS` / `TIER_REFERRAL_COMMISSION`.
 * Firebase-backed helpers are skipped here (run against emulator separately if needed).
 */

import {
    calculateTierCommissions,
    TIER_REFERRAL_COMMISSION,
} from "@/lib/tier-referral-system";

function tierAmount(deposit: number, percent: number): number {
    return parseFloat(((deposit * percent) / 100).toFixed(2));
}

describe("calculateTierCommissions", () => {
    test("matches configured percents for $100 deposit", () => {
        const commissions = calculateTierCommissions(100);
        expect(commissions).toHaveLength(3);
        expect(commissions[0]).toEqual({
            level: 1,
            percent: TIER_REFERRAL_COMMISSION.level1,
            amount: tierAmount(100, TIER_REFERRAL_COMMISSION.level1),
        });
        expect(commissions[1]).toEqual({
            level: 2,
            percent: TIER_REFERRAL_COMMISSION.level2,
            amount: tierAmount(100, TIER_REFERRAL_COMMISSION.level2),
        });
        expect(commissions[2]).toEqual({
            level: 3,
            percent: TIER_REFERRAL_COMMISSION.level3,
            amount: tierAmount(100, TIER_REFERRAL_COMMISSION.level3),
        });
    });

    test("scales for $500 deposit", () => {
        const commissions = calculateTierCommissions(500);
        expect(commissions[0].amount).toBe(tierAmount(500, TIER_REFERRAL_COMMISSION.level1));
        expect(commissions[1].amount).toBe(tierAmount(500, TIER_REFERRAL_COMMISSION.level2));
        expect(commissions[2].amount).toBe(tierAmount(500, TIER_REFERRAL_COMMISSION.level3));
    });

    test("scales for $1000 deposit", () => {
        const commissions = calculateTierCommissions(1000);
        expect(commissions[0].amount).toBe(tierAmount(1000, TIER_REFERRAL_COMMISSION.level1));
        expect(commissions[1].amount).toBe(tierAmount(1000, TIER_REFERRAL_COMMISSION.level2));
        expect(commissions[2].amount).toBe(tierAmount(1000, TIER_REFERRAL_COMMISSION.level3));
    });

    test("rounds to 2 decimal places", () => {
        const commissions = calculateTierCommissions(33.33);
        expect(commissions[0].amount).toBe(tierAmount(33.33, TIER_REFERRAL_COMMISSION.level1));
        expect(commissions[1].amount).toBe(tierAmount(33.33, TIER_REFERRAL_COMMISSION.level2));
        expect(commissions[2].amount).toBe(tierAmount(33.33, TIER_REFERRAL_COMMISSION.level3));
    });

    test("handles $0 deposit", () => {
        const commissions = calculateTierCommissions(0);
        expect(commissions.every((c) => c.amount === 0)).toBe(true);
    });

    test("handles small deposits", () => {
        const commissions = calculateTierCommissions(1);
        expect(commissions[0].amount).toBe(tierAmount(1, TIER_REFERRAL_COMMISSION.level1));
        expect(commissions[1].amount).toBe(tierAmount(1, TIER_REFERRAL_COMMISSION.level2));
        expect(commissions[2].amount).toBe(tierAmount(1, TIER_REFERRAL_COMMISSION.level3));
    });

    test("handles large deposits", () => {
        const commissions = calculateTierCommissions(100_000);
        expect(commissions[0].amount).toBe(tierAmount(100_000, TIER_REFERRAL_COMMISSION.level1));
        expect(commissions[1].amount).toBe(tierAmount(100_000, TIER_REFERRAL_COMMISSION.level2));
        expect(commissions[2].amount).toBe(tierAmount(100_000, TIER_REFERRAL_COMMISSION.level3));
    });

    test("returns correct level numbers", () => {
        const commissions = calculateTierCommissions(100);
        expect(commissions[0].level).toBe(1);
        expect(commissions[1].level).toBe(2);
        expect(commissions[2].level).toBe(3);
    });
});

describe("Tier commission percents (single source)", () => {
    test("levels match referral defaults (5 / 3 / 2)", () => {
        expect(TIER_REFERRAL_COMMISSION.level1).toBe(5);
        expect(TIER_REFERRAL_COMMISSION.level2).toBe(3);
        expect(TIER_REFERRAL_COMMISSION.level3).toBe(2);
        expect(
            TIER_REFERRAL_COMMISSION.level1 +
                TIER_REFERRAL_COMMISSION.level2 +
                TIER_REFERRAL_COMMISSION.level3
        ).toBe(10);
    });
});

describe("Commission edge cases", () => {
    test("negative deposit propagates negative slices", () => {
        const commissions = calculateTierCommissions(-100);
        expect(commissions[0].amount).toBe(tierAmount(-100, TIER_REFERRAL_COMMISSION.level1));
        expect(commissions[1].amount).toBe(tierAmount(-100, TIER_REFERRAL_COMMISSION.level2));
        expect(commissions[2].amount).toBe(tierAmount(-100, TIER_REFERRAL_COMMISSION.level3));
    });

    test("tiny positive deposit rounds to cents", () => {
        const commissions = calculateTierCommissions(0.01);
        expect(commissions[0].amount).toBe(0);
        expect(commissions[1].amount).toBe(0);
        expect(commissions[2].amount).toBe(0);
    });

    test("large numeric values stay finite", () => {
        const commissions = calculateTierCommissions(Number.MAX_SAFE_INTEGER);
        expect(commissions[0].amount).toBeGreaterThan(0);
        expect(commissions[1].amount).toBeGreaterThan(0);
        expect(commissions[2].amount).toBeGreaterThan(0);
    });
});

describe("Full commission totals", () => {
    test("sum of tiers equals deposit * total percent / 100", () => {
        const depositAmount = 500;
        const commissions = calculateTierCommissions(depositAmount);
        const totalPct =
            TIER_REFERRAL_COMMISSION.level1 +
            TIER_REFERRAL_COMMISSION.level2 +
            TIER_REFERRAL_COMMISSION.level3;
        const expected = tierAmount(depositAmount, totalPct);
        const sum = commissions.reduce((s, c) => s + c.amount, 0);
        expect(sum).toBe(expected);
    });
});

/**
 * Marketing / legal copy aligned with code defaults (`DEFAULT_REFERRAL_SETTINGS`, `DEPOSIT_INCOME_TIERS`).
 * Use on public pages so landing text matches in-app behavior and reduces “promised vs delivered” disputes.
 */
import { DEPOSIT_INCOME_TIERS, type DepositIncomeTier } from "@/lib/deposit-income-tiers";
import { DEFAULT_REFERRAL_SETTINGS } from "@/lib/referral-system";

export const PLATFORM_MIN_INVESTMENT_USD: number = DEPOSIT_INCOME_TIERS[0]?.min ?? 30;

export const DEPOSIT_TIERS_FOR_DISPLAY: DepositIncomeTier[] = DEPOSIT_INCOME_TIERS;

/** Shown near any published % so users check the app if admins changed settings. */
export const RATES_ARE_DEFAULTS_DISCLAIMER =
    "These percentages are the platform defaults. Your signed-in Referrals page shows the rates that apply to you; administrators can change global settings.";

const s = DEFAULT_REFERRAL_SETTINGS;

/** Per-deposit MLM (3 uplines) — matches `distributeInvestmentReferralCommissions` defaults. */
export const REFERRAL_PER_DEPOSIT_SUMMARY = `When someone in your downline activates an investment (plan deposit), up to three uplines earn ${s.level1_percent}% (direct) / ${s.level2_percent}% / ${s.level3_percent}% of that deposit amount. Each new qualifying plan activation pays again the same way. Wallet top-ups that do not activate a plan do not trigger these commissions.`;

/** Daily claim share — matches `distributeDailyClaimReferralCommissions` when enabled. */
export const REFERRAL_DAILY_CLAIM_SUMMARY = s.daily_income_commission_enabled
    ? `When that member claims their daily profit, the same three uplines can earn ${s.daily_level1_percent}% / ${s.daily_level2_percent}% / ${s.daily_level3_percent}% of the amount they claimed that day (credits go to referral balance; very small calculated amounts may appear as $0.01).`
    : "Daily profit–claim commissions to uplines may be turned off in platform settings; when enabled, small percentages of each claim are shared with three uplines.";

/** Where money lands — matches Wallet + referral_balance behavior. */
export const EARNINGS_AND_REFERRAL_CREDIT_SUMMARY =
    "Plan income is credited to your main balance when you run your daily claim (once per UTC day on active positions). Referral commissions credit to your referral balance; both pools combine for withdrawals on the Wallet page, subject to fees and limits.";

export const REFERRAL_PROGRAM_COMBINED_PARAGRAPH = `${REFERRAL_PER_DEPOSIT_SUMMARY} ${REFERRAL_DAILY_CLAIM_SUMMARY}`;

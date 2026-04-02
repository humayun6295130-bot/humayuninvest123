/**
 * Shared expected payout math for NOWPayments server fulfillment + QR dialog.
 */
import { resolveDailyIncomeForDeposit } from '@/lib/deposit-income-tiers';

export interface PlanReturnInput {
    name?: string;
    fixed_amount?: number;
    min_amount: number;
    max_amount: number;
    duration_days: number;
    return_percent: number;
    daily_roi_percent: number;
    total_return?: number;
    capital_return?: boolean;
}

export function computeExpectedReturnUsd(plan: PlanReturnInput | null, amount: number): number {
    if (!plan || !Number.isFinite(amount) || amount <= 0) return 0;
    const tr = plan.total_return;
    if (typeof tr === 'number' && Number.isFinite(tr) && tr >= amount * 0.5) {
        return tr;
    }
    const dur = Number(plan.duration_days) || 30;
    const capital = plan.capital_return !== false;
    const tiered = resolveDailyIncomeForDeposit(amount);
    if (tiered.dailyUsd > 0 && dur > 0) {
        const profit = tiered.dailyUsd * dur;
        return profit + (capital ? amount : 0);
    }
    const retPct = Number(plan.return_percent) || 0;
    if (retPct > 0) {
        const profit = amount * (retPct / 100);
        return profit + (capital ? amount : 0);
    }
    return amount * 2;
}

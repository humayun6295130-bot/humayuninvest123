import { insertRow } from '@/firebase/database';
import { db } from '@/firebase/config';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { awardCommission, getReferralSettings } from '@/lib/referral-system';

export interface ActivateQrInvestmentParams {
    user_id: string;
    user_email: string;
    plan_id: string;
    plan_name: string;
    /** Daily ROI percent per day (from investment plan) */
    daily_roi_percent?: number;
    /** Total return % on principal (fallback when daily_roi_percent is 0) */
    return_percent?: number;
    amount: number;
    expected_return: number;
    duration_days: number;
    transaction_id: string;
    proof_image_url?: string | null;
    wallet_address: string;
    /** e.g. nowpayments_usdt_bep20, usdt_bep20 */
    payment_method?: string;
    /** Audit line for pending_investments */
    notes?: string;
}

/**
 * Creates active investment + audit pending row + transaction + referral commissions
 * (same outcome as admin approval in investment-approval.tsx).
 */
export async function activateInvestmentAfterVerifiedPayment(
    params: ActivateQrInvestmentParams
): Promise<void> {
    const timestamp = new Date().toISOString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (params.duration_days > 0 ? params.duration_days : 30));

    const dur = params.duration_days > 0 ? params.duration_days : 30;
    let daily_roi_percent = Number(params.daily_roi_percent ?? 0) || 0;
    if (daily_roi_percent <= 0) {
        const ret = Number(params.return_percent ?? 0);
        if (Number.isFinite(ret) && ret > 0 && dur > 0) {
            daily_roi_percent = ret / dur;
        }
    }
    const daily_roi = daily_roi_percent > 0 ? (params.amount * daily_roi_percent) / 100 : 0;

    await insertRow('user_investments', {
        user_id: params.user_id,
        plan_id: params.plan_id,
        plan_name: params.plan_name,
        amount: params.amount,
        daily_roi,
        daily_roi_percent,
        total_return: params.expected_return,
        total_profit: params.expected_return - params.amount,
        earned_so_far: 0,
        claimed_so_far: 0,
        days_claimed: 0,
        start_date: timestamp,
        end_date: endDate.toISOString(),
        status: 'active',
        auto_compound: false,
        capital_return: true,
        payout_schedule: 'end_of_term',
    });

    await insertRow('pending_investments', {
        user_id: params.user_id,
        user_email: params.user_email,
        plan_id: params.plan_id,
        plan_name: params.plan_name,
        amount: params.amount,
        expected_return: params.expected_return,
        wallet_address: params.wallet_address,
        status: 'approved',
        payment_method: params.payment_method ?? 'usdt_bep20',
        transaction_id: params.transaction_id,
        proof_image_url: params.proof_image_url ?? null,
        processed_at: timestamp,
        notes: params.notes ?? 'Auto-verified',
    });

    await insertRow('transactions', {
        user_id: params.user_id,
        type: 'investment',
        amount: -params.amount,
        status: 'completed',
        description: `Investment in ${params.plan_name} — ${params.payment_method === 'nowpayments_usdt_bep20' ? 'NOWPayments' : 'BSC USDT'} (auto-verified)`,
        transaction_hash: params.transaction_id,
    });

    if (db) {
        try {
            await updateDoc(doc(db, 'users', params.user_id), {
                total_invested: increment(params.amount),
                updated_at: timestamp,
            });
        } catch (balErr) {
            console.error('total_invested increment (non-fatal):', balErr);
        }
    }

    if (db) {
        try {
            const settings = await getReferralSettings();
            const commissionPercents = [
                settings.level1_percent,
                settings.level2_percent,
                settings.level3_percent,
                settings.level4_percent ?? 0,
                settings.level5_percent ?? 0,
            ];
            const userDoc = await getDoc(doc(db, 'users', params.user_id));
            if (userDoc.exists()) {
                let currentReferrerId = userDoc.data().referrer_id;
                let level = 0;
                while (currentReferrerId && level < 5) {
                    const percent = commissionPercents[level] ?? 0;
                    const referrerDoc = await getDoc(doc(db, 'users', currentReferrerId));
                    if (!referrerDoc.exists()) break;
                    if (percent > 0) {
                        const commission = params.amount * (percent / 100);
                        await awardCommission(
                            db,
                            currentReferrerId,
                            params.user_id,
                            userDoc.data().username || params.user_email || '',
                            commission,
                            'investment',
                            params.amount,
                            { uplineDepth: level + 1, percentApplied: percent }
                        );
                    }
                    currentReferrerId = referrerDoc.data().referrer_id;
                    level++;
                }
            }
        } catch (refErr) {
            console.error('Referral commission error (non-fatal):', refErr);
        }
    }
}

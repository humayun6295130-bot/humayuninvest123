import { insertRow } from '@/firebase/database';
import { db } from '@/firebase/config';
import { collection, doc, getDoc, getDocs, increment, limit, query, updateDoc, where } from 'firebase/firestore';
import { distributeInvestmentReferralCommissions } from '@/lib/referral-system';
import { resolveDailyIncomeForDeposit } from '@/lib/deposit-income-tiers';

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
    /** Invoice reference (NOWPayments order_id / user panel) */
    order_id?: string | null;
}

/**
 * Creates active investment + audit pending row + transaction + referral commissions
 * (same outcome as admin approval in investment-approval.tsx).
 * @returns true if a new investment was created; false if this TX was already activated (idempotent).
 */
export async function activateInvestmentAfterVerifiedPayment(
    params: ActivateQrInvestmentParams
): Promise<boolean> {
    if (!db) {
        throw new Error('Firebase is not configured');
    }

    const txKey = params.transaction_id.trim().toLowerCase();

    // Must scope by user_id so Firestore rules allow the query (see firestore.rules read on these collections).
    const invSnap = await getDocs(
        query(
            collection(db, 'user_investments'),
            where('user_id', '==', params.user_id),
            where('transaction_hash', '==', txKey),
            limit(25)
        )
    );
    if (!invSnap.empty) {
        return false;
    }

    const txSnap = await getDocs(
        query(
            collection(db, 'transactions'),
            where('user_id', '==', params.user_id),
            where('transaction_hash', '==', txKey),
            limit(40)
        )
    );
    const alreadyDebited = txSnap.docs.some((d) => {
        const x = d.data();
        return (
            x.type === 'investment' &&
            Number(x.amount) < 0 &&
            (x.status === 'completed' || x.status === 'approved')
        );
    });
    if (alreadyDebited) {
        return false;
    }

    const timestamp = new Date().toISOString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (params.duration_days > 0 ? params.duration_days : 30));

    const dur = params.duration_days > 0 ? params.duration_days : 30;
    const tiered = resolveDailyIncomeForDeposit(params.amount);
    const daily_roi_percent = tiered.incomePercent;
    const daily_roi = tiered.dailyUsd;
    const total_profit = daily_roi * dur;
    const total_return = params.amount + total_profit;

    await insertRow('user_investments', {
        user_id: params.user_id,
        plan_id: params.plan_id,
        plan_name: params.plan_name,
        amount: params.amount,
        daily_roi,
        daily_roi_percent,
        deposit_tier_level: tiered.tierLevel,
        income_percent: tiered.incomePercent,
        total_return,
        total_profit,
        earned_so_far: 0,
        claimed_so_far: 0,
        days_claimed: 0,
        start_date: timestamp,
        end_date: endDate.toISOString(),
        status: 'active',
        auto_compound: false,
        capital_return: true,
        payout_schedule: 'end_of_term',
        transaction_hash: txKey,
        blockchain_verified:
            !String(params.payment_method || '').includes('admin') &&
            !String(params.payment_method || '').toLowerCase().includes('balance'),
        ...(params.order_id ? { order_id: params.order_id } : {}),
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
        transaction_id: txKey,
        proof_image_url: params.proof_image_url ?? null,
        processed_at: timestamp,
        notes: params.notes ?? 'Auto-verified',
        ...(params.order_id ? { order_id: params.order_id } : {}),
    });

    await insertRow('transactions', {
        user_id: params.user_id,
        type: 'investment',
        amount: -params.amount,
        status: 'completed',
        description: `Investment in ${params.plan_name} — ${params.payment_method === 'nowpayments_usdt_bep20' ? 'NOWPayments' : 'BSC USDT'} (auto-verified)`,
        transaction_hash: txKey,
    });

    if (db) {
        try {
            await updateDoc(doc(db, 'users', params.user_id), {
                total_invested: increment(params.amount),
                active_plan: params.plan_name,
                updated_at: timestamp,
            });
        } catch (balErr) {
            console.error('total_invested increment (non-fatal):', balErr);
        }
    }

    if (db) {
        try {
            const userDoc = await getDoc(doc(db, "users", params.user_id));
            const display =
                userDoc.exists() && userDoc.data().username
                    ? userDoc.data().username
                    : params.user_email || "";
            await distributeInvestmentReferralCommissions(
                db,
                params.user_id,
                params.amount,
                display
            );
        } catch (refErr) {
            console.error("Referral commission error (non-fatal):", refErr);
        }
    }

    return true;
}

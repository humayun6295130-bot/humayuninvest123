import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_REFERRAL_SETTINGS, type ReferralSettings } from '@/lib/referral-system';
import type { ActivateQrInvestmentParams } from '@/lib/activate-qr-investment';
import { REFERRAL_COMMISSION_MAX_DEPTH, resolveDailyIncomeForDeposit } from '@/lib/deposit-income-tiers';

async function getReferralSettingsAdmin(adminDb: Firestore): Promise<ReferralSettings> {
    const snap = await adminDb.collection('referral_settings').doc('default').get();
    if (snap.exists) return snap.data() as ReferralSettings;
    return DEFAULT_REFERRAL_SETTINGS;
}

async function awardOneCommissionAdmin(
    adminDb: Firestore,
    referrerId: string,
    fromUserId: string,
    fromUsername: string,
    amount: number,
    type: 'investment',
    uplineDepth: number,
    percentApplied: number
): Promise<void> {
    const userDoc = await adminDb.collection('users').doc(referrerId).get();
    if (!userDoc.exists) return;
    const userData = userDoc.data()!;
    if (userData.team_commission_enabled === false) return;

    const timestamp = new Date().toISOString();

    const batch = adminDb.batch();
    const bonusRef = adminDb.collection('referral_bonuses').doc();
    batch.set(bonusRef, {
        user_id: referrerId,
        user_email: userData.email,
        from_user_id: fromUserId,
        from_username: fromUsername,
        amount,
        type,
        level: uplineDepth,
        level_percent: percentApplied,
        description: `Investment bonus — upline level ${uplineDepth} (${percentApplied}% of deposit) from ${fromUsername}`,
        status: 'approved',
        created_at: timestamp,
        paid_at: timestamp,
    });

    const teamRef = adminDb.collection('user_teams').doc(referrerId);
    batch.set(
        teamRef,
        {
            user_id: referrerId,
            total_commission_earned: FieldValue.increment(amount),
            updated_at: timestamp,
        },
        { merge: true }
    );

    batch.update(adminDb.collection('users').doc(referrerId), {
        referral_earnings: FieldValue.increment(amount),
        referral_balance: FieldValue.increment(amount),
        updated_at: timestamp,
    });

    await batch.commit();
}

async function runReferralChainAdmin(
    adminDb: Firestore,
    investorUserId: string,
    investorEmail: string,
    investmentAmount: number
): Promise<void> {
    const settings = await getReferralSettingsAdmin(adminDb);
    const commissionPercents = [
        settings.level1_percent,
        settings.level2_percent,
        settings.level3_percent,
    ];
    const userDoc = await adminDb.collection('users').doc(investorUserId).get();
    if (!userDoc.exists) return;
    let currentReferrerId = userDoc.data()?.referrer_id as string | undefined;
    let level = 0;
    const fromName = userDoc.data()?.username || investorEmail || '';

    while (currentReferrerId && level < REFERRAL_COMMISSION_MAX_DEPTH) {
        const percent = commissionPercents[level] ?? 0;
        const referrerDoc = await adminDb.collection('users').doc(currentReferrerId).get();
        if (!referrerDoc.exists) break;
        if (percent > 0) {
            const commission = investmentAmount * (percent / 100);
            try {
                await awardOneCommissionAdmin(
                    adminDb,
                    currentReferrerId,
                    investorUserId,
                    fromName,
                    commission,
                    'investment',
                    level + 1,
                    percent
                );
            } catch (e) {
                console.error('Referral commission (admin) non-fatal:', e);
            }
        }
        currentReferrerId = referrerDoc.data()?.referrer_id as string | undefined;
        level++;
    }
}

/**
 * Same outcome as activateInvestmentAfterVerifiedPayment but using Firebase Admin (server).
 * Bypasses client Firestore permission / flaky browser writes.
 */
export async function activateInvestmentWithAdminDb(
    adminDb: Firestore,
    params: ActivateQrInvestmentParams
): Promise<void> {
    const timestamp = new Date().toISOString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (params.duration_days > 0 ? params.duration_days : 30));

    const dur = params.duration_days > 0 ? params.duration_days : 30;
    const tiered = resolveDailyIncomeForDeposit(params.amount);
    const daily_roi_percent = tiered.incomePercent;
    const daily_roi = tiered.dailyUsd;
    const total_profit = daily_roi * dur;
    const total_return = params.amount + total_profit;

    await adminDb.collection('user_investments').add({
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
        created_at: timestamp,
        updated_at: timestamp,
        ...(params.order_id ? { order_id: params.order_id } : {}),
    });

    await adminDb.collection('pending_investments').add({
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
        created_at: timestamp,
        updated_at: timestamp,
        ...(params.order_id ? { order_id: params.order_id } : {}),
    });

    await adminDb.collection('transactions').add({
        user_id: params.user_id,
        type: 'investment',
        amount: -params.amount,
        status: 'completed',
        description: `Investment in ${params.plan_name} — ${params.payment_method === 'nowpayments_usdt_bep20' ? 'NOWPayments' : 'BSC USDT'} (auto-verified)`,
        transaction_hash: params.transaction_id,
        created_at: timestamp,
        updated_at: timestamp,
    });

    await adminDb.collection('users').doc(params.user_id).set(
        {
            total_invested: FieldValue.increment(params.amount),
            updated_at: timestamp,
        },
        { merge: true }
    );

    try {
        await runReferralChainAdmin(adminDb, params.user_id, params.user_email, params.amount);
    } catch (e) {
        console.error('Referral chain (admin) non-fatal:', e);
    }
}

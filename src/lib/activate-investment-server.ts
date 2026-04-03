import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateTeamLevel, normalizeReferralSettings, type ReferralSettings } from '@/lib/referral-system';
import type { ActivateQrInvestmentParams } from '@/lib/activate-qr-investment';
import {
    DEPOSIT_INCOME_TIERS,
    parseDepositTiersFirestore,
    REFERRAL_COMMISSION_MAX_DEPTH,
    resolveDailyIncomeForDeposit,
    type DepositIncomeTier,
} from '@/lib/deposit-income-tiers';
import { roundMoney2 } from '@/lib/wallet-totals';

async function getReferralSettingsAdmin(adminDb: Firestore): Promise<ReferralSettings> {
    const snap = await adminDb.collection('referral_settings').doc('default').get();
    if (snap.exists) return normalizeReferralSettings(snap.data() as Record<string, unknown>);
    return normalizeReferralSettings({});
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

    const pairSnap = await adminDb
        .collection('referrals')
        .where('referrer_id', '==', referrerId)
        .where('referred_user_id', '==', fromUserId)
        .limit(1)
        .get();

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
        description: `Per-deposit lifetime commission — Level ${uplineDepth} (${percentApplied}% of this deposit) from ${fromUsername}`,
        status: 'approved',
        created_at: timestamp,
        paid_at: timestamp,
    });

    if (!pairSnap.empty) {
        batch.update(pairSnap.docs[0].ref, {
            total_commission: FieldValue.increment(amount),
            updated_at: timestamp,
        });
    }

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

async function bumpUplineTeamVolumeAdmin(adminDb: Firestore, uplineUid: string, deltaUsd: number): Promise<void> {
    const delta = roundMoney2(deltaUsd);
    if (delta <= 0) return;

    const teamRef = adminDb.collection('user_teams').doc(uplineUid);
    const snap = await teamRef.get();
    const timestamp = new Date().toISOString();

    if (!snap.exists) {
        await teamRef.set(
            {
                user_id: uplineUid,
                total_members: 0,
                level1_count: 0,
                level2_count: 0,
                level3_count: 0,
                level4_count: 0,
                level5_count: 0,
                total_team_investment: delta,
                total_commission_earned: 0,
                current_level: calculateTeamLevel(0, delta),
                updated_at: timestamp,
            },
            { merge: true }
        );
        return;
    }

    const td = snap.data()!;
    const totalMembers = td.total_members || 0;
    const totalInvestment = roundMoney2((td.total_team_investment || 0) + delta);
    const newLevel = calculateTeamLevel(totalMembers, totalInvestment);
    await teamRef.update({
        total_team_investment: totalInvestment,
        current_level: newLevel,
        updated_at: timestamp,
    });
}

async function runReferralChainAdmin(
    adminDb: Firestore,
    investorUserId: string,
    investorEmail: string,
    investmentAmount: number
): Promise<void> {
    if (investmentAmount <= 0) return;

    const settings = await getReferralSettingsAdmin(adminDb);
    const payCommission = settings.enabled;

    const commissionPercents = [
        settings.level1_percent,
        settings.level2_percent,
        settings.level3_percent,
    ];
    const userDoc = await adminDb.collection('users').doc(investorUserId).get();
    if (!userDoc.exists) return;
    let currentReferrerId = userDoc.data()?.referrer_id as string | undefined;
    if (typeof currentReferrerId === 'string') currentReferrerId = currentReferrerId.trim() || undefined;
    let level = 0;
    const fromName = userDoc.data()?.username || investorEmail || '';

    while (currentReferrerId && level < REFERRAL_COMMISSION_MAX_DEPTH) {
        const referrerDoc = await adminDb.collection('users').doc(currentReferrerId).get();
        if (!referrerDoc.exists) break;

        try {
            await bumpUplineTeamVolumeAdmin(adminDb, currentReferrerId, investmentAmount);
        } catch (e) {
            console.error('bumpUplineTeamVolumeAdmin (non-fatal):', e);
        }

        if (payCommission) {
            const percent = Number(commissionPercents[level] ?? 0);
            if (percent > 0) {
                const commission = roundMoney2(investmentAmount * (percent / 100));
                if (commission > 0) {
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
            }
        }

        const nextRaw = referrerDoc.data()?.referrer_id as string | undefined;
        currentReferrerId =
            typeof nextRaw === 'string' && nextRaw.trim().length > 0 ? nextRaw.trim() : undefined;
        level++;
    }
}

async function loadTierTableAdmin(adminDb: Firestore): Promise<DepositIncomeTier[]> {
    try {
        const snap = await adminDb.collection('platform_settings').doc('main').get();
        const parsed = parseDepositTiersFirestore(snap.data()?.deposit_tiers);
        return parsed ?? DEPOSIT_INCOME_TIERS;
    } catch {
        return DEPOSIT_INCOME_TIERS;
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
    const txKey = params.transaction_id.trim().toLowerCase();

    const invDup = await adminDb
        .collection('user_investments')
        .where('transaction_hash', '==', txKey)
        .limit(25)
        .get();
    if (invDup.docs.some((d) => d.data().user_id === params.user_id)) {
        return;
    }

    const txDup = await adminDb
        .collection('transactions')
        .where('transaction_hash', '==', txKey)
        .limit(40)
        .get();
    const alreadyDebited = txDup.docs.some((d) => {
        const x = d.data();
        return (
            x.user_id === params.user_id &&
            x.type === 'investment' &&
            Number(x.amount) < 0 &&
            (x.status === 'completed' || x.status === 'approved')
        );
    });
    if (alreadyDebited) {
        return;
    }

    const timestamp = new Date().toISOString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (params.duration_days > 0 ? params.duration_days : 30));

    const dur = params.duration_days > 0 ? params.duration_days : 30;
    const tierTable = await loadTierTableAdmin(adminDb);
    const tiered = resolveDailyIncomeForDeposit(params.amount, tierTable);
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
        transaction_hash: txKey,
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
        transaction_id: txKey,
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
        transaction_hash: txKey,
        created_at: timestamp,
        updated_at: timestamp,
    });

    await adminDb.collection('users').doc(params.user_id).set(
        {
            total_invested: FieldValue.increment(params.amount),
            active_plan: params.plan_name,
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

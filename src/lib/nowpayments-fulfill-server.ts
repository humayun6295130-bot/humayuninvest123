/**
 * Server-side NOWPayments fulfillment (IPN + optional internal retries).
 * Idempotent per payment_id via transaction_hash np_<paymentId>.
 */
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { npGetPayment, isPaymentStatusComplete, usdAmountsMatch } from '@/lib/nowpayments-internal';
import {
    isInvestmentOrderIdForUser,
    isWalletDepositOrderIdForUser,
    NOWPAYMENTS_WALLET_PLAN_ID,
} from '@/lib/investment-order-id';
import { MIN_WALLET_DEPOSIT_USD } from '@/lib/wallet-config';
import { activateInvestmentWithAdminDb } from '@/lib/activate-investment-server';
import type { ActivateQrInvestmentParams } from '@/lib/activate-qr-investment';
import { computeExpectedReturnUsd, type PlanReturnInput } from '@/lib/investment-expected-return';

export type FulfillNpResult =
    | { ok: true; action: 'wallet_credited' | 'investment_activated' | 'already_done' | 'ignored' }
    | { ok: false; error: string };

function parseDepositUserId(orderId: string): string | null {
    const m = /^dep_([a-zA-Z0-9]+)_(\d+)$/.exec(orderId.trim());
    return m ? m[1] : null;
}

/** planId may contain underscores; trailing segment is numeric timestamp from buildInvestmentOrderId */
function parseInvestmentParts(orderId: string): { userId: string; planId: string } | null {
    const m = /^inv_([a-zA-Z0-9]+)_(.+)_(\d{10,20})$/.exec(orderId.trim());
    if (!m) return null;
    return { userId: m[1], planId: m[2] };
}

function planDocToReturnInput(pdata: Record<string, unknown>): PlanReturnInput {
    return {
        name: String(pdata.name ?? ''),
        fixed_amount: pdata.fixed_amount != null ? Number(pdata.fixed_amount) : undefined,
        min_amount: Number(pdata.min_amount) || 0,
        max_amount: Number(pdata.max_amount) || 1_000_000,
        duration_days: Number(pdata.duration_days) || 30,
        return_percent: Number(pdata.return_percent) || 0,
        daily_roi_percent: Number(pdata.daily_roi_percent) || 0,
        total_return: pdata.total_return != null ? Number(pdata.total_return) : undefined,
        capital_return: pdata.capital_return !== false,
    };
}

/**
 * After NOWPayments reports a terminal success status, credit wallet or activate plan (Admin SDK).
 */
export async function fulfillNowPaymentFromProvider(
    adminDb: Firestore,
    paymentId: string
): Promise<FulfillNpResult> {
    const id = String(paymentId ?? '').trim();
    if (!id || !/^\d+$/.test(id)) {
        return { ok: false, error: 'invalid payment id' };
    }

    const result = await npGetPayment(id);
    if (!result.ok) {
        return { ok: false, error: 'payment lookup failed' };
    }

    const d = result.data;
    const status = String(d.payment_status ?? '');
    if (!isPaymentStatusComplete(status)) {
        return { ok: true, action: 'ignored' };
    }

    const orderId = String(d.order_id ?? '').trim();
    if (!orderId) {
        return { ok: false, error: 'missing order_id' };
    }

    const priceAmt = Number(d.price_amount);
    if (!Number.isFinite(priceAmt) || priceAmt <= 0) {
        return { ok: false, error: 'invalid price_amount' };
    }

    const txKey = `np_${id}`.toLowerCase();

    const dupPending = await adminDb
        .collection('pending_investments')
        .where('transaction_id', '==', txKey)
        .limit(1)
        .get();
    if (!dupPending.empty) {
        return { ok: true, action: 'already_done' };
    }

    const dupTx = await adminDb.collection('transactions').where('transaction_hash', '==', txKey).limit(1).get();
    if (!dupTx.empty) {
        return { ok: true, action: 'already_done' };
    }

    // ─── Wallet top-up ───
    if (orderId.startsWith('dep_')) {
        const uid = parseDepositUserId(orderId);
        if (!uid || !isWalletDepositOrderIdForUser(orderId, uid)) {
            return { ok: false, error: 'invalid deposit order' };
        }
        if (priceAmt < MIN_WALLET_DEPOSIT_USD) {
            return { ok: false, error: 'below minimum deposit' };
        }

        const userSnap = await adminDb.collection('users').doc(uid).get();
        const email = String(userSnap.data()?.email ?? '');

        const nowIso = new Date().toISOString();
        const batch = adminDb.batch();
        batch.update(adminDb.collection('users').doc(uid), {
            balance: FieldValue.increment(priceAmt),
            updated_at: nowIso,
        });
        batch.set(adminDb.collection('transactions').doc(), {
            user_id: uid,
            user_email: email,
            type: 'deposit',
            amount: priceAmt,
            currency: 'USD',
            status: 'completed',
            description: 'Deposit — NOWPayments (wallet top-up, IPN/server)',
            transaction_hash: txKey,
            payment_method: 'nowpayments_usdt_bep20',
            wallet_address: String(d.pay_address ?? 'NOWPayments'),
            order_id: orderId,
            nowpayments_payment_id: id,
            created_at: nowIso,
        });
        await batch.commit();
        return { ok: true, action: 'wallet_credited' };
    }

    // ─── Investment ───
    if (!orderId.startsWith('inv_')) {
        return { ok: true, action: 'ignored' };
    }

    const parts = parseInvestmentParts(orderId);
    if (!parts || !isInvestmentOrderIdForUser(orderId, parts.userId)) {
        return { ok: false, error: 'invalid investment order' };
    }

    if (parts.planId === NOWPAYMENTS_WALLET_PLAN_ID) {
        return { ok: true, action: 'ignored' };
    }

    const planSnap = await adminDb.collection('investment_plans').doc(parts.planId).get();
    if (!planSnap.exists) {
        return { ok: false, error: 'plan not found' };
    }

    const planInput = planDocToReturnInput(planSnap.data() as Record<string, unknown>);
    const fixed = planInput.fixed_amount;
    if (typeof fixed === 'number' && Number.isFinite(fixed) && fixed > 0) {
        if (!usdAmountsMatch(fixed, priceAmt)) {
            return { ok: false, error: 'amount mismatch for fixed plan' };
        }
    } else {
        const tol = Math.max(0.25, priceAmt * 0.03);
        if (priceAmt + tol < planInput.min_amount || priceAmt - tol > planInput.max_amount) {
            return { ok: false, error: 'amount outside plan bounds' };
        }
    }

    const userSnap = await adminDb.collection('users').doc(parts.userId).get();
    const email = String(userSnap.data()?.email ?? '');

    const planName = String(planSnap.data()?.name ?? 'Investment plan');
    const durationDays = planInput.duration_days > 0 ? planInput.duration_days : 30;
    const expectedReturn = computeExpectedReturnUsd(planInput, priceAmt);

    const params: ActivateQrInvestmentParams = {
        user_id: parts.userId,
        user_email: email,
        plan_id: parts.planId,
        plan_name: planName,
        daily_roi_percent: planInput.daily_roi_percent,
        return_percent: planInput.return_percent,
        amount: priceAmt,
        expected_return: Number.isFinite(expectedReturn) ? expectedReturn : priceAmt * 2,
        duration_days: durationDays,
        transaction_id: txKey,
        proof_image_url: null,
        wallet_address: String(d.pay_address ?? 'NOWPayments'),
        payment_method: 'nowpayments_usdt_bep20',
        notes: 'Auto-verified (NOWPayments, IPN/server)',
        order_id: orderId,
    };

    await activateInvestmentWithAdminDb(adminDb, params);
    return { ok: true, action: 'investment_activated' };
}

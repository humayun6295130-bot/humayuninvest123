import { db } from '@/firebase/config';
import { runTransaction, doc, collection } from 'firebase/firestore';
import { roundMoney2 } from '@/lib/wallet-totals';

export type AdminReferralBonusExtras = {
  bonusType: string;
  wallet_tx_id?: string | null;
  level?: number;
};

/**
 * Atomically credits referral_balance (+ referral_earnings), writes a completed `transactions`
 * row (visible on Wallet / History), and creates `referral_bonuses` — so balance and ledger stay in sync.
 */
export async function applyAdminReferralBonusLedger(params: {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  amount: number;
  memo: string;
  extras: AdminReferralBonusExtras;
}): Promise<void> {
  if (!db) throw new Error('Firebase is not configured');
  const amount = roundMoney2(params.amount);
  if (amount <= 0 || Number.isNaN(amount)) throw new Error('Invalid amount');

  const memo = params.memo.trim();
  if (memo.length < 3) {
    throw new Error('Enter a short reason (at least 3 characters) — it appears on the member’s transaction history.');
  }

  const now = new Date().toISOString();
  const userRef = doc(db, 'users', params.userId);
  const txRef = doc(collection(db, 'transactions'));
  const bonusRef = doc(collection(db, 'referral_bonuses'));

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error('User not found');

    const d = snap.data();
    const refBal = roundMoney2(Number(d.referral_balance) || 0);
    const refEarn = roundMoney2(Number(d.referral_earnings) || 0);

    transaction.update(userRef, {
      referral_balance: roundMoney2(refBal + amount),
      referral_earnings: roundMoney2(refEarn + amount),
      updated_at: now,
    });

    transaction.set(txRef, {
      user_id: params.userId,
      user_display_name: params.userDisplayName || params.userEmail || 'User',
      user_email: params.userEmail || '',
      type: 'referral_bonus',
      amount,
      currency: 'USD',
      status: 'completed',
      description: memo,
      created_at: now,
      updated_at: now,
    });

    transaction.set(bonusRef, {
      user_id: params.userId,
      user_email: params.userEmail,
      amount,
      type: params.extras.bonusType,
      description: memo,
      wallet_tx_id: params.extras.wallet_tx_id ?? null,
      ...(params.extras.level != null ? { level: params.extras.level } : {}),
      status: 'approved',
      created_at: now,
      created_by: 'admin',
      approved_at: now,
    });
  });
}

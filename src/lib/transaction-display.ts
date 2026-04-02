/** Types that increase user spendable / withdrawable balance (credits). */
const CREDIT_TYPES = new Set([
  'deposit',
  'daily_claim',
  'daily_profit',
  'earning_claim',
  'referral_bonus',
  'wallet_credit',
  'admin_credit',
]);

export function isUserCreditTransactionType(type: string | undefined): boolean {
  return !!type && CREDIT_TYPES.has(type);
}

/**
 * User-facing status line: credits show green “Received” instead of raw “completed” / “approved”.
 */
export function userTransactionStatusPresentation(tx: {
  status?: string;
  type?: string;
}): { label: string; className: string } {
  const status = (tx.status || '').toLowerCase();
  const type = tx.type || '';

  if (status === 'failed' || status === 'rejected') {
    return { label: status === 'rejected' ? 'Rejected' : 'Failed', className: 'bg-red-500/15 text-red-600 border-red-500/25' };
  }
  if (status === 'pending' || status === 'processing') {
    return { label: 'Pending', className: 'bg-amber-500/15 text-amber-700 border-amber-500/25' };
  }

  if (isUserCreditTransactionType(type) && (status === 'completed' || status === 'approved')) {
    return { label: 'Received', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
  }

  if (status === 'completed') {
    return { label: 'Completed', className: 'bg-muted text-muted-foreground border-border' };
  }
  if (status === 'approved') {
    return { label: 'Approved', className: 'bg-blue-500/15 text-blue-700 border-blue-500/25' };
  }

  return {
    label: tx.status ? String(tx.status).replace(/_/g, ' ') : '—',
    className: 'bg-muted text-muted-foreground border-border',
  };
}

/** Valid ?tab= values for /admin — keep in sync with AdminDashboard TabsContent */
export const ADMIN_TAB_IDS = [
    'overview',
    'users',
    'payments',
    'transactions',
    'withdrawals',
    'investments',
    'referrals',
    'kyc',
    'support',
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

export function isValidAdminTab(tab: string | null | undefined): tab is AdminTabId {
    return !!tab && (ADMIN_TAB_IDS as readonly string[]).includes(tab);
}

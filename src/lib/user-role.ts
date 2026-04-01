/**
 * Single source of truth for “can use admin panel” checks.
 * Firestore may store role as admin | super_admin | Administrator | etc.
 */
export function normalizeRoleString(role: unknown): string {
    if (role == null || role === '') return 'user';
    return String(role).trim().toLowerCase().replace(/\s+/g, '_');
}

export function isAdminRoleValue(role: unknown): boolean {
    const r = normalizeRoleString(role);
    return (
        r === 'admin' ||
        r === 'administrator' ||
        r === 'super_admin' ||
        r === 'superadmin'
    );
}

export function isAdminProfile(profile: { role?: unknown } | null | undefined): boolean {
    if (!profile) return false;
    return isAdminRoleValue(profile.role);
}

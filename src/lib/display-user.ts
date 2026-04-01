/**
 * Display helpers so we prefer @username over email in member-facing UI.
 */

export function looksLikeEmail(s: string | undefined | null): boolean {
    if (!s?.trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function referralMemberPrimaryLabel(r: {
    referred_username?: string | null;
    referred_name?: string | null;
    referred_email?: string | null;
}): string {
    const u = r.referred_username?.trim();
    if (u) return `@${u}`;
    const n = r.referred_name?.trim();
    if (n && !looksLikeEmail(n)) return n;
    return r.referred_email?.trim() || "Member";
}

/** Extra context: real name and/or email (muted in UI). */
export function referralMemberSecondaryLabel(r: {
    referred_username?: string | null;
    referred_name?: string | null;
    referred_email?: string | null;
}): string | null {
    const u = r.referred_username?.trim();
    const n = r.referred_name?.trim();
    const email = r.referred_email?.trim();
    const parts: string[] = [];
    if (u && n && !looksLikeEmail(n) && n.toLowerCase() !== u.toLowerCase()) parts.push(n);
    if (email) parts.push(email);
    return parts.length ? parts.join(" · ") : null;
}

export function adminUserHeadline(u: {
    username?: string | null;
    display_name?: string | null;
    email?: string | null;
}): string {
    if (u.username?.trim()) return `@${u.username.trim()}`;
    return u.display_name?.trim() || u.email?.trim() || "—";
}

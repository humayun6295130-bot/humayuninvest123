import type { Metadata } from 'next';

/** Hostname from NEXT_PUBLIC_BASE_URL (e.g. www.example.com). */
export function getSiteHostname(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!base) return '';
  try {
    const url = base.includes('://') ? base : `https://${base}`;
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Browser tab / OG title: optional NEXT_PUBLIC_SITE_TITLE, else hostname from BASE_URL, else fallback.
 */
export function getDefaultSiteTitle(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_TITLE?.trim();
  if (explicit) return explicit;
  const host = getSiteHostname();
  if (host) return host;
  return 'BTCMine';
}

export function getSupportEmail(): string {
  const e = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (e) return e;
  const h = getSiteHostname();
  if (h) return `support@${h}`;
  return '';
}

export function buildRootMetadata(): Metadata {
  const title = getDefaultSiteTitle();
  return {
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description: 'Investment and earnings platform — manage deposits, withdrawals, and referrals securely.',
  };
}

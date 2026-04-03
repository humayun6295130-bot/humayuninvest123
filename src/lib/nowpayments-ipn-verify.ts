import crypto from 'crypto';

/**
 * Deep-sort object keys (arrays keep order). Matches common NOWPayments IPN signing
 * when the payload contains nested objects — flat JSON.stringify(params, sortedKeys) does not.
 */
export function sortJsonKeysDeep(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(sortJsonKeysDeep);
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
        out[k] = sortJsonKeysDeep(o[k]);
    }
    return out;
}

/**
 * NOWPayments sends x-nowpayments-sig = HMAC-SHA512(ipn_secret, payload).
 * Implementations differ: some sign the raw POST body, others a key-sorted JSON string.
 * Accept if any canonical candidate matches.
 */
export function verifyNowpaymentsIpnSignature(
    rawBody: string,
    ipnSecret: string,
    parsed: Record<string, unknown>,
    receivedSig: string
): boolean {
    const sig = receivedSig.trim().toLowerCase();
    if (!sig) return false;

    const mac = (payload: string) =>
        crypto.createHmac('sha512', ipnSecret).update(payload, 'utf8').digest('hex').toLowerCase();

    const candidates = new Set<string>();
    candidates.add(mac(rawBody));
    if (rawBody !== rawBody.trimEnd()) {
        candidates.add(mac(rawBody.trimEnd()));
    }

    const sortedTopKeys = Object.keys(parsed).sort();
    try {
        candidates.add(mac(JSON.stringify(parsed, sortedTopKeys)));
    } catch {
        /* ignore */
    }
    try {
        candidates.add(mac(JSON.stringify(sortJsonKeysDeep(parsed))));
    } catch {
        /* ignore */
    }

    for (const c of candidates) {
        if (c === sig) return true;
    }
    return false;
}

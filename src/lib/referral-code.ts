/**
 * Generate a unique referral code for a user
 * Format: prefix + random string (e.g., REF + A7B2C9)
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Generate a random referral code
 * @param prefix - Prefix for the code (default: 'REF')
 * @param length - Length of random part (default: 6)
 */
export function generateReferralCode(prefix: string = 'REF', length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';

    for (let i = 0; i < length; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}${randomPart}`;
}

/**
 * Check if a referral code is unique
 * @param code - The referral code to check
 */
export async function isReferralCodeUnique(code: string): Promise<boolean> {
    if (!db) return false;

    try {
        const q = query(collection(db, 'users'), where('referral_code', '==', code));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    } catch (error) {
        console.error('Error checking referral code uniqueness:', error);
        return false;
    }
}

/**
 * Generate a unique referral code
 * @param prefix - Prefix for the code (default: 'REF')
 * @param maxAttempts - Maximum attempts to generate unique code
 */
export async function generateUniqueReferralCode(
    prefix: string = 'REF',
    maxAttempts: number = 10
): Promise<string> {
    let attempts = 0;

    while (attempts < maxAttempts) {
        const code = generateReferralCode(prefix);
        const isUnique = await isReferralCodeUnique(code);

        if (isUnique) {
            return code;
        }

        attempts++;
    }

    // Fallback: use timestamp-based code
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Generate referral code from username
 * @param username - The username to convert to referral code
 */
export function generateReferralCodeFromUsername(username: string): string {
    // Convert username to uppercase and limit length
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = cleanUsername.substring(0, Math.min(cleanUsername.length, 4));

    // Add random suffix
    const suffix = generateReferralCode('', 4);

    return `${prefix}${suffix}`;
}

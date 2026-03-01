/**
 * Support ID Generator
 * Generates a unique random digit number for users
 * This ID is used for support and reference purposes
 */

/**
 * Generate a random support ID (6-8 digits)
 * Format: 6-8 digit number (e.g., 847291, 12345678)
 */
export function generateSupportId(): string {
    // Generate 6-8 digit random number
    const min = 100000; // 6 digits
    const max = 99999999; // 8 digits
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNum.toString();
}

/**
 * Format support ID with dashes for readability
 * e.g., 847291 → 847-291
 */
export function formatSupportId(supportId: string): string {
    if (supportId.length <= 3) return supportId;

    // Add dash every 3 digits from the right
    const parts = [];
    let remaining = supportId;

    while (remaining.length > 3) {
        parts.unshift(remaining.slice(-3));
        remaining = remaining.slice(0, -3);
    }
    parts.unshift(remaining);

    return parts.join('-');
}

/**
 * Validate support ID format
 * Should be 6-8 digits
 */
export function isValidSupportId(supportId: string): boolean {
    return /^\d{6,8}$/.test(supportId);
}

/**
 * Generate a unique support ID that doesn't exist in the database
 * This is a helper function - actual uniqueness check should be done before saving
 */
export function generateUniqueSupportId(): string {
    return generateSupportId();
}

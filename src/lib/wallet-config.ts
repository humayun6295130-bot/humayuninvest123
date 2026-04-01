/**
 * Centralized Wallet Configuration
 * All payment-related components should use this file for wallet addresses and QR code generation
 * 
 * MIGRATED: Now uses BEP20 (BSC ChainID: 56) as the sole accepted cryptocurrency
 */

// Get admin wallet address from environment variable (BSC BEP20 — 0x address)
// Prefer BSC-specific key so legacy NEXT_PUBLIC_ADMIN_WALLET_ADDRESS can remain TRON for old scripts.
// Returns safe string (empty if not configured)
export const getAdminWalletAddress = (): string => {
    const address =
        process.env.NEXT_PUBLIC_BSC_ADMIN_WALLET_ADDRESS?.trim() ||
        process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS?.trim() ||
        '';
    // Do not log during `next build` / prerender — many deployments use NOWPayments only (no public BSC admin wallet).
    // Legacy on-chain verification still uses ADMIN_WALLET_* server env in API routes when needed.
    return address || '';
};

// Admin's USDT BEP20 Wallet Address (BNB Smart Chain - ChainID: 56)
export const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();

// USDT Token Contract Address on BNB Smart Chain (BEP20)
export const USDT_CONTRACT_BSC = '0x55d398326f99059fF775485246999027B319E5C';

/** Minimum USD amount for wallet top-up (manual + NOWPayments). */
export const MIN_WALLET_DEPOSIT_USD = 50;

// Fallback addresses for different networks (not used - kept for reference)
export const WALLET_ADDRESSES = {
    // BEP20 (BNB Smart Chain) - Primary (Only accepted)
    usdt_bep20: ADMIN_WALLET_ADDRESS,

    // USDT Contract on BSC
    usdt_contract: USDT_CONTRACT_BSC,

    // ChainID for BSC
    chain_id: 56,

    // Network name
    network_name: 'BNB Smart Chain',

    // Symbol
    currency_symbol: 'USDT',

    // ERC-20 (Ethereum) - Deprecated, not accepted
    usdt_erc20: '',

    // BTC - Deprecated, not accepted
    btc: '',
};

/**
 * Check if wallet is properly configured
 */
export const isWalletConfigured = (): boolean => {
    return !!ADMIN_WALLET_ADDRESS && ADMIN_WALLET_ADDRESS.length > 0;
};

/**
 * Generate QR Code URL for BEP20 USDT payment
 * @param amount - Payment amount in USDT
 * @returns QR code image URL
 */
export const generateBEP20QRCode = (amount: number): string => {
    if (!ADMIN_WALLET_ADDRESS) return '';

    // Plain wallet address QR - works with all wallet apps
    // Any scanner will show the admin wallet address directly
    const qrData = ADMIN_WALLET_ADDRESS;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&qzone=2`;
};

/**
 * Generate QR Code URL for plain address (works with any wallet app)
 * @param address - Wallet address
 * @param amount - Optional payment amount
 * @returns QR code image URL
 */
export const generateGenericQRCode = (address: string, amount?: number): string => {
    if (!address) return '';

    let data = address;
    if (amount && amount > 0) {
        data = `${address}?amount=${amount}`;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
};

/**
 * Generate ERC-20 USDT QR Code
 */
export const generateERC20QRCode = (amount: number): string => {
    const address = WALLET_ADDRESSES.usdt_erc20;
    // Ethereum-style payment URI
    const paymentData = `ethereum:${address}@1?value=${amount * 1e6}&token=USDT`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData)}`;
};

/**
 * Generate BTC QR Code
 */
export const generateBTCQRCode = (amount: number): string => {
    const address = WALLET_ADDRESSES.btc;
    if (!address) return '';

    // Bitcoin-style payment URI
    const paymentData = `bitcoin:${address}?amount=${amount}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData)}`;
};

/**
 * Get wallet info for display
 * Now uses BEP20 (BNB Smart Chain) exclusively
 */
export const getWalletInfo = () => ({
    network: 'BNB SMART CHAIN (ChainID: 56)',
    currency: 'USDT (BEP20)',
    tokenContract: USDT_CONTRACT_BSC,
    address: ADMIN_WALLET_ADDRESS || '',
    symbol: '₮',
    scanInstructions: ADMIN_WALLET_ADDRESS
        ? 'Send USDT (BEP20) to this address using BNB Smart Chain. Do NOT send from Ethereum or other networks.'
        : 'Wallet address not configured. Please contact support.'
});

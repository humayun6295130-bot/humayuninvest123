/**
 * Centralized Wallet Configuration
 * All payment-related components should use this file for wallet addresses and QR code generation
 */

// Get admin wallet address from environment variable
// Returns safe string (empty if not configured)
export const getAdminWalletAddress = (): string => {
    const address = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
    if (!address) {
        console.warn('WARNING: NEXT_PUBLIC_ADMIN_WALLET_ADDRESS environment variable is not set. Payment features may not work correctly.');
    }
    return address || '';
};

// Admin's USDT TRC-20 Wallet Address (TRON Network)
export const ADMIN_WALLET_ADDRESS = getAdminWalletAddress();

// Fallback addresses for different networks (if needed)
export const WALLET_ADDRESSES = {
    // TRC-20 (TRON) - Primary
    usdt_trc20: ADMIN_WALLET_ADDRESS,

    // ERC-20 (Ethereum) - Secondary (leave empty if not used)
    usdt_erc20: process.env.NEXT_PUBLIC_ADMIN_ERC20_ADDRESS || '',

    // BTC - for Bitcoin payments
    btc: process.env.NEXT_PUBLIC_ADMIN_BTC_ADDRESS || '',
};

/**
 * Check if wallet is properly configured
 */
export const isWalletConfigured = (): boolean => {
    return !!ADMIN_WALLET_ADDRESS && ADMIN_WALLET_ADDRESS.length > 0;
};

/**
 * Generate QR Code URL for TRC-20 USDT payment
 * @param amount - Payment amount in USDT
 * @returns QR code image URL
 */
export const generateTRC20QRCode = (amount: number): string => {
    if (!ADMIN_WALLET_ADDRESS) return '';

    // TRON-style payment URI
    const paymentData = `tron://transfer?to=${ADMIN_WALLET_ADDRESS}&amount=${amount}&token=USDT`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData)}`;
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
 */
export const getWalletInfo = () => ({
    network: 'TRC-20 (TRON)',
    currency: 'USDT',
    address: ADMIN_WALLET_ADDRESS || '',
    symbol: '₮',
    scanInstructions: ADMIN_WALLET_ADDRESS
        ? 'Scan with Trust Wallet, MetaMask, or any TRC-20 compatible wallet'
        : 'Wallet address not configured. Please contact support.'
});

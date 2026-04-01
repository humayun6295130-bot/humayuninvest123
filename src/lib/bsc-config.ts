/** Shared BSC / BEP20 config for RPC and client helpers. */

export const BEP20_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B319E5C";

export const BSC_RPC_URL =
    process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed1.binance.org";

export const BSCSAN_API_URL = "https://api.bscscan.com/api";

export const BSCSAN_API_KEY =
    process.env.NEXT_PUBLIC_BSCSAN_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_BSCSCAN_API_KEY?.trim() ||
    "";

import { NextRequest, NextResponse } from 'next/server';
import { USDT_CONTRACT_BSC } from '@/lib/wallet-config';

/** Ensure this route always reads fresh env at runtime (Vercel serverless). */
export const dynamic = 'force-dynamic';

/**
 * BscScan JSON API (BSC). Use for tokentx / proxy when BSCSCAN_API_KEY is set — works on free tier for BSC.
 * Etherscan API V2 multichain often blocks BSC on free plans ("Free API access is not supported for this chain").
 */
const BSCSCAN_API = 'https://api.bscscan.com/api';
const ETHERSCAN_V2_API = 'https://api.etherscan.io/v2/api';
const BSC_CHAIN_ID = '56';

/** ERC-20 Transfer(address indexed from, address indexed to, uint256 value) */
const ERC20_TRANSFER_TOPIC =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/** Binance-Peg USDT on BSC — 18 decimals (1e18 wei per 1 USDT). */
const WAD = 10n ** 18n;

/** Exact USD (human) → wei for 18-decimal USDT; avoids float drift on the receipt path. */
function usdAmountToWei(amount: number): bigint {
    if (!Number.isFinite(amount) || amount <= 0) return 0n;
    const s = amount.toFixed(18);
    const [w, f = ''] = s.split('.');
    const frac = (f + '000000000000000000').slice(0, 18);
    return BigInt(w) * WAD + BigInt(frac || '0');
}

function minAcceptableWei(expectedAmount: number): bigint {
    const tolUsd = Math.max(0.02, expectedAmount * 0.002);
    const exp = usdAmountToWei(expectedAmount);
    const tol = usdAmountToWei(tolUsd);
    return exp > tol ? exp - tol : 0n;
}

function weiToUsdNumber(wei: bigint): number {
    return Number(wei) / Number(WAD);
}

/** Any explorer key (union) — used when a single string is enough. */
function resolveExplorerApiKey(): string {
    return (
        process.env.BSCSCAN_API_KEY?.trim() ||
        process.env.NEXT_PUBLIC_BSCSCAN_API_KEY?.trim() ||
        process.env.ETHERSCAN_API_KEY?.trim() ||
        process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY?.trim() ||
        ''
    );
}

function resolveBscScanOnlyKey(): string {
    return process.env.BSCSCAN_API_KEY?.trim() || process.env.NEXT_PUBLIC_BSCSCAN_API_KEY?.trim() || '';
}

function resolveEtherscanOnlyKey(): string {
    return process.env.ETHERSCAN_API_KEY?.trim() || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY?.trim() || '';
}

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/i;

function normalizeHexAddress(addr: string): string {
    let s = (addr || '').trim().toLowerCase();
    if (!s) return '';
    if (!s.startsWith('0x')) s = '0x' + s;
    return ADDR_RE.test(s) ? s : '';
}

/**
 * BSC platform wallet (must be `0x` + 40 hex — not TRON `T...`).
 * Prefer BSC-specific keys; legacy NEXT_PUBLIC_ADMIN_WALLET_ADDRESS may still hold TRON from older configs.
 */
function resolvePlatformWallet(): {
    address: string;
    source: 'admin' | 'bsc' | 'bsc_public' | 'platform' | 'public' | '';
} {
    const candidates: Array<[string, 'admin' | 'bsc' | 'bsc_public' | 'platform' | 'public']> = [
        [process.env.ADMIN_WALLET_ADDRESS?.trim() ?? '', 'admin'],
        [process.env.BSC_ADMIN_WALLET_ADDRESS?.trim() ?? '', 'bsc'],
        [process.env.NEXT_PUBLIC_BSC_ADMIN_WALLET_ADDRESS?.trim() ?? '', 'bsc_public'],
        [process.env.PLATFORM_WALLET_ADDRESS?.trim() ?? '', 'platform'],
        [process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS?.trim() ?? '', 'public'],
    ];
    for (const [raw, source] of candidates) {
        const a = raw.toLowerCase();
        if (a && ADDR_RE.test(a)) return { address: a, source };
    }
    return { address: '', source: '' };
}

function topicLastAddress(topic: string): string {
    let t = (topic || '').toLowerCase();
    if (!t.startsWith('0x')) t = '0x' + t;
    if (t.length < 66) return '';
    return '0x' + t.slice(-40);
}

function normalizeTopicSig(topic: string): string {
    let t = (topic || '').toLowerCase();
    if (!t.startsWith('0x')) t = '0x' + t;
    return t;
}

/** Sum USDT (BEP20) Transfer wei to expectedRecipient from receipt logs. */
function sumUsdtTransfersToRecipient(
    logs: Array<Record<string, unknown>>,
    usdt: string,
    expectedRecipient: string
): bigint {
    let total = 0n;
    for (const log of logs) {
        const addr = normalizeHexAddress(String(log.address ?? ''));
        if (!addr || addr !== usdt) continue;
        const topics = ((log.topics as unknown[]) || []).map((t) => String(t));
        if (topics.length < 3) continue;
        if (normalizeTopicSig(topics[0]) !== ERC20_TRANSFER_TOPIC) continue;
        const toAddr = topicLastAddress(topics[2]);
        if (toAddr !== expectedRecipient) continue;
        const data = String(log.data || '0x');
        total += parseDataUint256(data);
    }
    return total;
}

/** Public BSC node — no API key; used when Etherscan receipt/logs are incomplete. */
async function fetchBscRpcReceipt(txHash: string): Promise<Record<string, unknown> | null> {
    const rpc = process.env.BSC_RPC_URL?.trim() || 'https://bsc-dataseed1.binance.org';
    try {
        const res = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getTransactionReceipt',
                params: [txHash],
            }),
            next: { revalidate: 0 },
        });
        const j = (await res.json()) as { result?: unknown; error?: { message?: string } };
        if (j.error || j.result === undefined || j.result === null) return null;
        const r = j.result;
        if (typeof r !== 'object' || r === null) return null;
        return r as Record<string, unknown>;
    } catch {
        return null;
    }
}

async function fetchBscRpcBlockNumber(): Promise<number | null> {
    const rpc = process.env.BSC_RPC_URL?.trim() || 'https://bsc-dataseed1.binance.org';
    try {
        const res = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_blockNumber',
                params: [],
            }),
            next: { revalidate: 0 },
        });
        const j = (await res.json()) as { result?: string; error?: unknown };
        if (j.error || !j.result) return null;
        return hexToNumber(j.result);
    } catch {
        return null;
    }
}

/** Unwrap nested JSON-RPC proxy objects until we reach the receipt (logs, blockNumber, …). */
function unwrapProxyReceipt(obj: Record<string, unknown>): Record<string, unknown> {
    let cur: Record<string, unknown> = obj;
    while (
        cur.jsonrpc === '2.0' &&
        cur.result &&
        typeof cur.result === 'object' &&
        !Array.isArray(cur.result)
    ) {
        cur = cur.result as Record<string, unknown>;
    }
    return cur;
}

function parseReceiptPayload(result: unknown): Record<string, unknown> | null {
    let parsed: Record<string, unknown> | null = null;
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        parsed = unwrapProxyReceipt(result as Record<string, unknown>);
    } else if (typeof result === 'string') {
        try {
            const p = JSON.parse(result) as unknown;
            if (p && typeof p === 'object' && !Array.isArray(p)) {
                parsed = unwrapProxyReceipt(p as Record<string, unknown>);
            }
        } catch {
            return null;
        }
    }
    return parsed;
}

function hexToNumber(hex: string): number {
    const h = hex.startsWith('0x') ? hex : '0x' + hex;
    return parseInt(h, 16);
}

/** JSON-RPC receipts may expose `blockNumber` as hex string or (rarely) a number. */
function receiptBlockNumber(receipt: { blockNumber?: unknown }): number {
    const v = receipt.blockNumber;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
    if (typeof v === 'string' && v.length > 0) return hexToNumber(v);
    return 0;
}

function parseDataUint256(data: string): bigint {
    const d = (data || '0x0').replace(/^0x/, '');
    if (!d) return 0n;
    return BigInt('0x' + d);
}

/**
 * `tokentx` `result` is usually a JSON array; occasionally a stringified array.
 * Error payloads use a plain string (e.g. rate limit) — not `[`-prefixed JSON.
 */
function parseTokentxRows<T>(result: unknown): T[] | null {
    if (Array.isArray(result)) return result as T[];
    if (typeof result === 'string') {
        const t = result.trim();
        if (t.startsWith('[')) {
            try {
                const p = JSON.parse(t) as unknown;
                return Array.isArray(p) ? (p as T[]) : null;
            } catch {
                return null;
            }
        }
        return null;
    }
    return null;
}

async function fetchBscScanApi(params: Record<string, string>): Promise<unknown> {
    const q = new URLSearchParams(params);
    const res = await fetch(`${BSCSCAN_API}?${q.toString()}`, {
        next: { revalidate: 0 },
    });
    const raw = await res.text();
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        throw new Error('Invalid JSON from BscScan API');
    }
}

async function fetchEtherscanV2(params: Record<string, string>): Promise<unknown> {
    const q = new URLSearchParams({ chainid: BSC_CHAIN_ID, ...params });
    const res = await fetch(`${ETHERSCAN_V2_API}?${q.toString()}`, {
        next: { revalidate: 0 },
    });
    const raw = await res.text();
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        throw new Error('Invalid JSON from Etherscan API');
    }
}

type TokenTxOpts = { startBlock?: number; endBlock?: number };

/** Fallback: ERC-20 tokentx to platform wallet — BscScan API when BSCSCAN_API_KEY is set, else Etherscan V2. */
async function verifyViaTokenTxList(
    txHash: string,
    expectedRecipient: string,
    expectedAmount: number,
    apiKey: string,
    minConfirmations: number,
    opts?: TokenTxOpts
): Promise<{ ok: true; txAmount: number; confirmations: number } | { ok: false; error: string }> {
    type Row = { hash?: string; to?: string; value?: string; tokenDecimal?: string; confirmations?: string };

    const bscTokentxKey = resolveBscScanOnlyKey();
    const ethTokentxKey = resolveEtherscanOnlyKey();
    const keyForTokentx = bscTokentxKey || ethTokentxKey || apiKey;
    if (!keyForTokentx) {
        return {
            ok: false,
            error:
                'Explorer fallback requires an API key. Set BSCSCAN_API_KEY (bscscan.com — recommended for BSC) or ETHERSCAN_API_KEY (paid multichain with BSC). Public RPC already confirmed the receipt when this message appears.',
        };
    }

    const baseParams = (page: string, offset: string, block?: TokenTxOpts): Record<string, string> => {
        const p: Record<string, string> = {
            module: 'account',
            action: 'tokentx',
            address: expectedRecipient,
            contractaddress: USDT_CONTRACT_BSC,
            page,
            offset,
            sort: 'desc',
        };
        if (block && block.startBlock !== undefined && block.endBlock !== undefined && block.startBlock > 0) {
            p.startblock = String(block.startBlock);
            p.endblock = String(block.endBlock);
        }
        return p;
    };

    const tryOnce = async (
        page: string,
        offset: string,
        block?: TokenTxOpts
    ): Promise<{ rows: Row[] | null; err: string | null }> => {
        const params = { ...baseParams(page, offset, block), apikey: keyForTokentx };
        const data = (await (bscTokentxKey
            ? fetchBscScanApi(params)
            : fetchEtherscanV2(params))) as {
            status?: unknown;
            message?: string;
            result?: Row[] | string;
        };
        if (data.status === '0' || data.status === 0) {
            const err =
                typeof data.result === 'string' ? data.result : data.message || 'Could not load token transfers';
            return { rows: null, err };
        }
        const rows = parseTokentxRows<Row>(data.result);
        if (rows === null) {
            const err =
                typeof data.result === 'string' && data.result.trim() !== '' && !data.result.trim().startsWith('[')
                    ? data.result
                    : data.message || 'Could not load token transfers';
            return { rows: null, err };
        }
        return { rows, err: null };
    };

    const finishRow = (
        row: Row
    ): { ok: true; txAmount: number; confirmations: number } | { ok: false; error: string } => {
        if ((row.to || '').toLowerCase() !== expectedRecipient) {
            return {
                ok: false,
                error: 'No USDT (BEP20) transfer matching this transaction to the platform wallet was found.',
            };
        }
        const dec = Math.min(parseInt(String(row.tokenDecimal), 10) || 18, 36);
        const txAmount = parseFloat(String(row.value)) / Math.pow(10, dec);
        const confirmations = parseInt(String(row.confirmations), 10) || 0;

        const tolerance = Math.max(0.02, expectedAmount * 0.002);
        if (txAmount + 1e-12 < expectedAmount - tolerance) {
            return {
                ok: false,
                error: `Amount too low: received ~${txAmount.toFixed(4)} USDT, expected at least ~${expectedAmount} USDT`,
            };
        }
        if (confirmations < minConfirmations) {
            return {
                ok: false,
                error: `Not enough block confirmations yet (${confirmations}/${minConfirmations}). Try again in a few minutes.`,
            };
        }
        return { ok: true, txAmount, confirmations };
    };

    // 1) Block-scoped query when we know the tx block (avoids missing txs outside first N rows).
    if (opts?.startBlock !== undefined && opts?.endBlock !== undefined && opts.startBlock > 0) {
        const { rows, err } = await tryOnce('1', '1000', {
            startBlock: opts.startBlock,
            endBlock: opts.endBlock,
        });
        if (!err && rows) {
            const row = rows.find((r) => (r.hash || '').toLowerCase() === txHash.toLowerCase());
            if (row) return finishRow(row);
        }
    }

    // 2) Paginate recent transfers (platform wallet may have >100 txs).
    const offset = '100';
    for (let page = 1; page <= 15; page++) {
        const { rows, err } = await tryOnce(String(page), offset);
        if (err) return { ok: false, error: err };
        const row = rows!.find((r) => (r.hash || '').toLowerCase() === txHash.toLowerCase());
        if (row) return finishRow(row);
        if (rows!.length < parseInt(offset, 10)) break;
    }

    return {
        ok: false,
        error: 'No USDT (BEP20) transfer matching this transaction to the platform wallet was found.',
    };
}

/**
 * Verify BSC USDT (BEP20) to platform wallet: public BSC RPC for receipt + confirmations;
 * optional Etherscan V2 / tokentx when an explorer API key is set (fallback paths).
 */
export async function POST(request: NextRequest) {
    try {
        const apiKey = resolveExplorerApiKey();

        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ valid: false, error: 'Invalid JSON body' }, { status: 400 });
        }

        const txHash = typeof body.txHash === 'string' ? body.txHash.trim().replace(/\s+/g, '') : '';
        const { address: platformWallet } = resolvePlatformWallet();
        const expectedAmount = typeof body.expectedAmount === 'number' ? body.expectedAmount : Number(body.expectedAmount);
        const minConfirmations =
            typeof body.minConfirmations === 'number' && body.minConfirmations >= 0
                ? body.minConfirmations
                : 3;

        if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
            return NextResponse.json({ valid: false, error: 'Invalid transaction hash' }, { status: 400 });
        }
        if (!platformWallet) {
            return NextResponse.json(
                {
                    valid: false,
                    error:
                        'Server payment wallet is not configured for BSC USDT. Set BSC_ADMIN_WALLET_ADDRESS or ADMIN_WALLET_ADDRESS (0x… BNB Smart Chain address, not TRON). Optional: NEXT_PUBLIC_BSC_ADMIN_WALLET_ADDRESS for UI + build. Legacy NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is ignored here if it is not a valid 0x address.',
                },
                { status: 501 }
            );
        }
        /** Always verify against server env — ignore body.expectedRecipient (avoids 400 when client bundle ≠ server ADMIN_*). */
        const expectedRecipient = platformWallet;
        if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
            return NextResponse.json({ valid: false, error: 'Invalid expected amount' }, { status: 400 });
        }

        const usdt = USDT_CONTRACT_BSC.toLowerCase();

        // 1) Receipt — public BSC RPC first (no API key; avoids Etherscan V2 free-tier BSC blocks).
        let receiptSource: 'etherscan' | 'rpc' = 'rpc';
        let receipt: Record<string, unknown> | null = await fetchBscRpcReceipt(txHash);
        let receiptPayload: {
            status?: string;
            message?: string;
            result?: Record<string, unknown> | string | null;
            error?: unknown;
        } | null = null;

        if (!receipt && apiKey) {
            const bscK = resolveBscScanOnlyKey();
            const ethK = resolveEtherscanOnlyKey();
            const applyReceiptPayload = (payload: NonNullable<typeof receiptPayload>) => {
                if (payload.error == null && String(payload.status ?? '') !== '0') {
                    const r = parseReceiptPayload(payload.result);
                    if (r) {
                        receipt = r;
                        receiptSource = 'etherscan';
                    }
                }
            };
            if (bscK) {
                try {
                    receiptPayload = (await fetchBscScanApi({
                        module: 'proxy',
                        action: 'eth_getTransactionReceipt',
                        txhash: txHash,
                        apikey: bscK,
                    })) as typeof receiptPayload;
                } catch {
                    return NextResponse.json(
                        { valid: false, error: 'Invalid response from blockchain API (receipt)' },
                        { status: 502 }
                    );
                }
                if (receiptPayload) applyReceiptPayload(receiptPayload);
            }
            if (!receipt && ethK) {
                try {
                    receiptPayload = (await fetchEtherscanV2({
                        module: 'proxy',
                        action: 'eth_getTransactionReceipt',
                        txhash: txHash,
                        apikey: ethK,
                    })) as typeof receiptPayload;
                } catch {
                    return NextResponse.json(
                        { valid: false, error: 'Invalid response from blockchain API (receipt)' },
                        { status: 502 }
                    );
                }
                if (receiptPayload) applyReceiptPayload(receiptPayload);
            }
        }

        if (!receipt) {
            const err =
                receiptPayload && String(receiptPayload.status) === '0'
                    ? typeof receiptPayload.result === 'string'
                        ? receiptPayload.result
                        : receiptPayload.message || 'Could not fetch transaction receipt'
                    : 'Transaction not found or still pending. Wait for confirmation and try again.';
            return NextResponse.json({ valid: false, error: err }, { status: 200 });
        }

        const status = (receipt as { status?: string }).status;
        if (status === '0x0') {
            return NextResponse.json(
                { valid: false, error: 'Transaction failed on-chain (reverted).' },
                { status: 200 }
            );
        }

        let logs = (receipt as { logs?: Array<Record<string, unknown>> }).logs || [];
        let txBlock = receiptBlockNumber(receipt as { blockNumber?: unknown });

        let receivedToPlatform = sumUsdtTransfersToRecipient(logs, usdt, expectedRecipient);

        if (receivedToPlatform === 0n && receiptSource === 'etherscan' && apiKey) {
            const rpcReceipt = await fetchBscRpcReceipt(txHash);
            if (rpcReceipt) {
                logs = (rpcReceipt as { logs?: Array<Record<string, unknown>> }).logs || [];
                txBlock = receiptBlockNumber(rpcReceipt as { blockNumber?: unknown });
                receivedToPlatform = sumUsdtTransfersToRecipient(logs, usdt, expectedRecipient);
                receiptSource = 'rpc';
            }
        }

        if (receivedToPlatform > 0n) {
            const minWei = minAcceptableWei(expectedAmount);
            if (receivedToPlatform < minWei) {
                const fb = await verifyViaTokenTxList(
                    txHash,
                    expectedRecipient,
                    expectedAmount,
                    apiKey,
                    minConfirmations,
                    txBlock > 0 ? { startBlock: txBlock, endBlock: txBlock } : undefined
                );
                if (!fb.ok) {
                    return NextResponse.json({ valid: false, error: fb.error }, { status: 200 });
                }
                return NextResponse.json({
                    valid: true,
                    confirmations: fb.confirmations,
                    amountReceived: fb.txAmount,
                });
            }

            let confirmations = 0;
            let rpcHead: number | null = null;
            if (txBlock > 0) {
                rpcHead = await fetchBscRpcBlockNumber();
                if (rpcHead !== null) {
                    confirmations = Math.max(0, rpcHead - txBlock);
                }
            }
            if (confirmations < minConfirmations) {
                const fb = await verifyViaTokenTxList(
                    txHash,
                    expectedRecipient,
                    expectedAmount,
                    apiKey,
                    minConfirmations,
                    txBlock > 0 ? { startBlock: txBlock, endBlock: txBlock } : undefined
                );
                if (fb.ok) {
                    return NextResponse.json({
                        valid: true,
                        confirmations: fb.confirmations,
                        amountReceived: fb.txAmount,
                    });
                }
                return NextResponse.json(
                    {
                        valid: false,
                        error: `Not enough block confirmations yet (${confirmations}/${minConfirmations}). Try again in a few minutes.`,
                    },
                    { status: 200 }
                );
            }

            return NextResponse.json({
                valid: true,
                confirmations,
                amountReceived: weiToUsdNumber(receivedToPlatform),
            });
        }

        const fb = await verifyViaTokenTxList(
            txHash,
            expectedRecipient,
            expectedAmount,
            apiKey,
            minConfirmations,
            txBlock > 0 ? { startBlock: txBlock, endBlock: txBlock } : undefined
        );
        if (!fb.ok) {
            return NextResponse.json({ valid: false, error: fb.error }, { status: 200 });
        }
        return NextResponse.json({
            valid: true,
            confirmations: fb.confirmations,
            amountReceived: fb.txAmount,
        });
    } catch (e: unknown) {
        const err = e instanceof Error ? e.message : 'Verification request failed';
        console.error('verify-bsc-usdt:', e);
        return NextResponse.json({ valid: false, error: err }, { status: 500 });
    }
}

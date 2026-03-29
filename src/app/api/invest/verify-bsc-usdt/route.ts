import { NextRequest, NextResponse } from 'next/server';
import { USDT_CONTRACT_BSC } from '@/lib/wallet-config';

const BSCSCAN_API = 'https://api.bscscan.com/api';

interface TokenTxRow {
    hash: string;
    from: string;
    to: string;
    value: string;
    tokenDecimal: string;
    confirmations: string;
}

function resolveBscScanApiKey(): string {
    // Prefer BscScan-specific key; then server-only Etherscan; then NEXT_PUBLIC_* (same key many users set in Vercel).
    // Note: NEXT_PUBLIC_ is exposed to the browser bundle—prefer ETHERSCAN_API_KEY or BSCSCAN_API_KEY in production.
    const k =
        process.env.BSCSCAN_API_KEY?.trim() ||
        process.env.ETHERSCAN_API_KEY?.trim() ||
        process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY?.trim() ||
        '';
    return k;
}

/**
 * Verify a BSC USDT (BEP20) transfer by tx hash using BscScan (Etherscan-family API).
 */
export async function POST(request: NextRequest) {
    try {
        const apiKey = resolveBscScanApiKey();
        if (!apiKey) {
            return NextResponse.json(
                {
                    valid: false,
                    error:
                        'Server missing API key. Set BSCSCAN_API_KEY, ETHERSCAN_API_KEY, or NEXT_PUBLIC_ETHERSCAN_API_KEY (Vercel redeploy required after env change).',
                },
                { status: 501 }
            );
        }

        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ valid: false, error: 'Invalid JSON body' }, { status: 400 });
        }

        const txHash = typeof body.txHash === 'string' ? body.txHash.trim().replace(/\s+/g, '') : '';
        const expectedRecipient =
            typeof body.expectedRecipient === 'string' ? body.expectedRecipient.trim().toLowerCase() : '';
        const expectedAmount = typeof body.expectedAmount === 'number' ? body.expectedAmount : Number(body.expectedAmount);
        const minConfirmations =
            typeof body.minConfirmations === 'number' && body.minConfirmations >= 0
                ? body.minConfirmations
                : 3;

        if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
            return NextResponse.json({ valid: false, error: 'Invalid transaction hash' }, { status: 400 });
        }
        if (!expectedRecipient || !/^0x[a-fA-F0-9]{40}$/i.test(expectedRecipient)) {
            return NextResponse.json({ valid: false, error: 'Invalid expected recipient address' }, { status: 400 });
        }
        if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
            return NextResponse.json({ valid: false, error: 'Invalid expected amount' }, { status: 400 });
        }

        const params = new URLSearchParams({
            module: 'account',
            action: 'tokentx',
            contractaddress: USDT_CONTRACT_BSC,
            txhash: txHash,
            apikey: apiKey,
        });

        const res = await fetch(`${BSCSCAN_API}?${params.toString()}`, {
            next: { revalidate: 0 },
        });

        let data: { status?: string; message?: string; result?: TokenTxRow[] | string };
        try {
            const raw = await res.text();
            data = JSON.parse(raw) as typeof data;
        } catch {
            return NextResponse.json(
                { valid: false, error: 'Invalid response from blockchain API' },
                { status: 502 }
            );
        }

        if (data.status !== '1' || !Array.isArray(data.result) || data.result.length === 0) {
            const rawMsg =
                typeof data.result === 'string'
                    ? data.result
                    : data.message && data.message !== 'OK'
                      ? data.message
                      : null;
            const lower = (rawMsg || '').toLowerCase();
            let msg =
                rawMsg ||
                'Transaction not found or not a USDT (BEP20) transfer';
            if (lower.includes('invalid api key') || lower.includes('not valid')) {
                msg =
                    'BscScan rejected the API key. Create a key at bscscan.com and set BSCSCAN_API_KEY, or use Etherscan key that works with BscScan endpoints.';
            }
            return NextResponse.json({ valid: false, error: msg }, { status: 200 });
        }

        const all = data.result as TokenTxRow[];
        let rows = all.filter(
            (r) =>
                (r.hash || '').toLowerCase() === txHash.toLowerCase() &&
                (r.to || '').toLowerCase() === expectedRecipient
        );
        if (rows.length === 0) {
            rows = all.filter((r) => (r.to || '').toLowerCase() === expectedRecipient);
        }

        if (rows.length === 0) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'USDT was not sent to the platform wallet address',
                },
                { status: 200 }
            );
        }

        const decimals = Math.min(parseInt(rows[0].tokenDecimal, 10) || 18, 36);
        let txAmount = 0;
        let confirmations = 0;
        for (const r of rows) {
            const dec = Math.min(parseInt(r.tokenDecimal, 10) || decimals, 36);
            txAmount += parseFloat(r.value) / Math.pow(10, dec);
            confirmations = Math.max(confirmations, parseInt(r.confirmations, 10) || 0);
        }

        const tolerance = Math.max(0.02, expectedAmount * 0.002);
        if (txAmount + 1e-9 < expectedAmount - tolerance) {
            return NextResponse.json(
                {
                    valid: false,
                    error: `Amount too low: received ~${txAmount.toFixed(4)} USDT, expected at least ~${expectedAmount} USDT`,
                },
                { status: 200 }
            );
        }

        if (confirmations < minConfirmations) {
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
            amountReceived: txAmount,
        });
    } catch (e: any) {
        console.error('verify-bsc-usdt:', e);
        return NextResponse.json(
            { valid: false, error: e?.message || 'Verification request failed' },
            { status: 500 }
        );
    }
}

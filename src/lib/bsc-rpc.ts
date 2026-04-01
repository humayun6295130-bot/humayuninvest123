/**
 * BNB Smart Chain JSON-RPC helpers (no explorer API key required).
 * Used by bep20.ts for balances, receipts, gas price, and limited USDT log history.
 */

import { BEP20_USDT_CONTRACT, BSC_RPC_URL } from "@/lib/bsc-config";

export const ERC20_TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** ~2.5h at 3s/block; many RPCs cap getLogs range (~3500). */
export const BSC_LOG_HISTORY_BLOCKS = 3000;

const BALANCE_OF_SELECTOR = "0x70a08231";

let rpcId = 1;

export async function bscRpcCall<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(BSC_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: rpcId++,
            method,
            params,
        }),
    });
    const json = (await res.json()) as { result?: T; error?: { message?: string } };
    if (json.error?.message) {
        throw new Error(json.error.message);
    }
    return json.result as T;
}

export function hexToBigInt(hex: string): bigint {
    const h = hex.startsWith("0x") ? hex : `0x${hex}`;
    return BigInt(h);
}

export function topicAddressToHex(topic: string): string {
    const t = topic.toLowerCase();
    if (t.length < 66) return "";
    return `0x${t.slice(-40)}`;
}

export function padAddressForTopic(addr: string): string {
    const hex = addr.toLowerCase().replace(/^0x/, "");
    return `0x${"0".repeat(24)}${hex}`;
}

function encodeBalanceOf(holder: string): string {
    const h = holder.toLowerCase().replace(/^0x/, "");
    return `${BALANCE_OF_SELECTOR}${"0".repeat(24)}${h}`;
}

export async function rpcGetLatestBlockNumber(): Promise<number> {
    const hex = await bscRpcCall<string>("eth_blockNumber", []);
    return Number(hexToBigInt(hex));
}

export async function rpcGetBnbBalanceWei(address: string): Promise<bigint> {
    const hex = await bscRpcCall<string>("eth_getBalance", [address, "latest"]);
    return hexToBigInt(hex);
}

export async function rpcGetErc20BalanceRaw(holder: string, contract: string): Promise<bigint> {
    const data = encodeBalanceOf(holder);
    const result = await bscRpcCall<string>("eth_call", [{ to: contract, data }, "latest"]);
    if (!result || result === "0x") return 0n;
    return hexToBigInt(result);
}

export type RpcReceipt = {
    status?: string;
    blockNumber?: string;
    logs?: Array<{
        address?: string;
        topics?: string[];
        data?: string;
        logIndex?: string;
    }>;
    gasUsed?: string;
};

export async function rpcGetTransactionReceipt(txHash: string): Promise<RpcReceipt | null> {
    const r = await bscRpcCall<RpcReceipt | null>("eth_getTransactionReceipt", [txHash]);
    return r ?? null;
}

export type RpcTx = {
    hash?: string;
    from?: string;
    to?: string;
    value?: string;
    blockNumber?: string | null;
    gasPrice?: string;
};

export async function rpcGetTransactionByHash(txHash: string): Promise<RpcTx | null> {
    const r = await bscRpcCall<RpcTx | null>("eth_getTransactionByHash", [txHash]);
    return r ?? null;
}

export async function rpcGetBlockTimestamp(blockHex: string): Promise<number> {
    const block = await bscRpcCall<{ timestamp?: string } | null>("eth_getBlockByNumber", [
        blockHex,
        false,
    ]);
    if (!block?.timestamp) return 0;
    return Number(hexToBigInt(block.timestamp)) * 1000;
}

export async function rpcEthGasPriceWei(): Promise<bigint> {
    const hex = await bscRpcCall<string>("eth_gasPrice", []);
    return hexToBigInt(hex);
}

export function parseUsdtTransferFromReceipt(
    receipt: RpcReceipt,
    _txHash: string,
    expectedToAddress?: string
): {
    from: string;
    to: string;
    valueRaw: string;
    logIndex: number;
} | null {
    const logs = receipt.logs ?? [];
    const contract = BEP20_USDT_CONTRACT.toLowerCase();

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const addr = (log.address ?? "").toLowerCase();
        const topics = log.topics ?? [];
        if (addr !== contract) continue;
        if (topics[0]?.toLowerCase() !== ERC20_TRANSFER_TOPIC.toLowerCase()) continue;
        if (topics.length < 3) continue;

        const from = topicAddressToHex(topics[1] ?? "");
        const to = topicAddressToHex(topics[2] ?? "");
        if (!from || !to) continue;

        if (
            expectedToAddress &&
            to.toLowerCase() !== expectedToAddress.toLowerCase()
        ) {
            continue;
        }

        const data = log.data ?? "0x";
        const valueRaw = hexToBigInt(data === "0x" ? "0x0" : data).toString();
        const logIndex = log.logIndex
            ? Number(hexToBigInt(log.logIndex))
            : i;

        return { from, to, valueRaw, logIndex };
    }

    return null;
}

export async function rpcConfirmationsForReceipt(receipt: RpcReceipt): Promise<number> {
    const blockHex = receipt.blockNumber;
    if (!blockHex) return 0;
    const txBlock = Number(hexToBigInt(blockHex));
    const latest = await rpcGetLatestBlockNumber();
    return Math.max(0, latest - txBlock + 1);
}

export async function rpcGetUsdtTransferLogsForAddress(
    address: string,
    fromBlock: number,
    toBlock: number
): Promise<
    Array<{
        txHash: string;
        blockNumber: number;
        from: string;
        to: string;
        valueRaw: string;
        logIndex: number;
    }>
> {
    const addrTopic = padAddressForTopic(address);
    const contract = BEP20_USDT_CONTRACT;

    const fromHex = "0x" + fromBlock.toString(16);
    const toHex = "0x" + toBlock.toString(16);

    const [incoming, outgoing] = await Promise.all([
        bscRpcCall<
            Array<{
                transactionHash?: string;
                blockNumber?: string;
                topics?: string[];
                data?: string;
                logIndex?: string;
            }>
        >("eth_getLogs", [
            {
                fromBlock: fromHex,
                toBlock: toHex,
                address: contract,
                topics: [ERC20_TRANSFER_TOPIC, null, addrTopic],
            },
        ]),
        bscRpcCall<
            Array<{
                transactionHash?: string;
                blockNumber?: string;
                topics?: string[];
                data?: string;
                logIndex?: string;
            }>
        >("eth_getLogs", [
            {
                fromBlock: fromHex,
                toBlock: toHex,
                address: contract,
                topics: [ERC20_TRANSFER_TOPIC, addrTopic, null],
            },
        ]),
    ]);

    const merged = new Map<
        string,
        {
            txHash: string;
            blockNumber: number;
            from: string;
            to: string;
            valueRaw: string;
            logIndex: number;
        }
    >();

    const ingest = (
        rows: Array<{
            transactionHash?: string;
            blockNumber?: string;
            topics?: string[];
            data?: string;
            logIndex?: string;
        }>
    ) => {
        for (const log of rows) {
            const txHash = log.transactionHash;
            const bn = log.blockNumber;
            const topics = log.topics ?? [];
            if (!txHash || !bn || topics.length < 3) continue;
            const from = topicAddressToHex(topics[1] ?? "");
            const to = topicAddressToHex(topics[2] ?? "");
            const data = log.data ?? "0x";
            const valueRaw = hexToBigInt(data === "0x" ? "0x0" : data).toString();
            const logIndex = log.logIndex ? Number(hexToBigInt(log.logIndex)) : 0;
            const blockNumber = Number(hexToBigInt(bn));
            const key = `${txHash}:${logIndex}`;
            merged.set(key, { txHash, blockNumber, from, to, valueRaw, logIndex });
        }
    };

    ingest(incoming ?? []);
    ingest(outgoing ?? []);

    return Array.from(merged.values()).sort((a, b) => b.blockNumber - a.blockNumber);
}

"use client";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { fetchRows, insertRow } from "@/firebase";

/**
 * Client-side fallback when `/api/nowpayments/complete-deposit` returns 501 (no Admin SDK).
 */
export async function creditWalletAfterNowpaymentsDeposit(params: {
    user_id: string;
    user_email?: string | null;
    user_display_name?: string | null;
    amount: number;
    order_id: string;
    payment_id: number;
    pay_address?: string;
}): Promise<boolean> {
    if (!db) return false;

    const txKey = `np_${params.payment_id}`.toLowerCase();

    const [pendingDup, txDup] = await Promise.all([
        fetchRows<{ transaction_id?: string }>("pending_investments", {
            filters: [{ column: "transaction_id", operator: "==", value: txKey }],
        }),
        fetchRows<{ transaction_hash?: string }>("transactions", {
            filters: [{ column: "transaction_hash", operator: "==", value: txKey }],
        }),
    ]);
    if (pendingDup.length > 0 || txDup.length > 0) {
        return false;
    }

    await insertRow("transactions", {
        user_id: params.user_id,
        user_email: params.user_email,
        user_display_name: params.user_display_name,
        type: "deposit",
        amount: params.amount,
        currency: "USD",
        status: "completed",
        description: "Deposit — NOWPayments (wallet top-up)",
        transaction_hash: txKey,
        payment_method: "nowpayments_usdt_bep20",
        wallet_address: params.pay_address || "NOWPayments",
        order_id: params.order_id,
        nowpayments_payment_id: String(params.payment_id),
    });

    const userRef = doc(db, "users", params.user_id);
    const snap = await getDoc(userRef);
    const bal = snap.exists() ? Number(snap.data()?.balance) || 0 : 0;
    await updateDoc(userRef, {
        balance: bal + params.amount,
        updated_at: new Date().toISOString(),
    });

    return true;
}

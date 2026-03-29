const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQslQz5Pt2Mfo_RdDo2FY7JZ4_EMZj7ak",
    authDomain: "invest-1e4f7.firebaseapp.com",
    databaseURL: "https://invest-1e4f7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "invest-1e4f7",
    storageBucket: "invest-1e4f7.firebasestorage.app",
    messagingSenderId: "40597371033",
    appId: "1:40597371033:web:2a1a4fb2c899bf3feca008",
    measurementId: "G-73Z7WKS6VG"
};

// Optional: set WALLET_ADDRESS=0x... in env to match NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
const WALLET_ADDRESS =
    process.env.WALLET_ADDRESS ||
    process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS ||
    "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";

async function setupQrPaymentSystem() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("🏗️  Setting up QR Payment System (BEP20 + auto-verify)...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        // _schema is documentation only; same collection shape as app writes.
        const schemaRef = doc(db, '_schema', 'pending_investments');
        batch.set(schemaRef, {
            description:
                'QR / BSC USDT investments. status=pending_payment_confirmation = awaiting action; approved = active (auto-verified on-chain or admin).',
            fields: [
                'user_id',
                'user_email',
                'plan_id',
                'plan_name',
                'amount',
                'expected_return',
                'wallet_address',
                'status',
                'payment_method',
                'transaction_id',
                'proof_image_url',
                'created_at',
                'updated_at',
                'processed_at',
                'processed_by',
                'notes',
            ],
            status_values: [
                'pending_payment_confirmation',
                'payment_received',
                'approved',
                'rejected',
            ],
            payment_method_values: ['usdt_bep20', 'usdt', 'eth'],
            wallet_address: WALLET_ADDRESS,
            created_at: timestamp,
        });

        const userInvSchemaRef = doc(db, '_schema', 'user_investments');
        batch.set(userInvSchemaRef, {
            description: 'Active/completed investments (created after payment verified).',
            fields: [
                'user_id',
                'plan_id',
                'plan_name',
                'amount',
                'daily_roi',
                'total_return',
                'total_profit',
                'earned_so_far',
                'claimed_so_far',
                'days_claimed',
                'start_date',
                'end_date',
                'status',
                'auto_compound',
                'capital_return',
                'payout_schedule',
                'created_at',
                'updated_at',
            ],
            created_at: timestamp,
        });

        const txSchemaRef = doc(db, '_schema', 'transactions');
        batch.set(txSchemaRef, {
            description: 'Ledger rows; investment rows may include transaction_hash (BSC tx id, lowercased).',
            fields: [
                'user_id',
                'user_email',
                'user_display_name',
                'type',
                'amount',
                'status',
                'description',
                'transaction_hash',
                'currency',
                'created_at',
                'updated_at',
            ],
            created_at: timestamp,
        });

        const qrSettingsRef = doc(db, 'platform_settings', 'qr_payment');
        batch.set(qrSettingsRef, {
            enabled: true,
            wallet_address: WALLET_ADDRESS,
            accepted_methods: ['usdt_bep20'],
            usdt_network: 'BEP20',
            chain: 'BNB Smart Chain',
            chain_id: 56,
            auto_verify: true,
            verification: 'BscScan tokentx + server /api/invest/verify-bsc-usdt',
            processing_time: 'Automatic after confirmations (typ. minutes)',
            min_amount: 10,
            max_amount: 100000,
            created_at: timestamp,
            updated_at: timestamp,
        }, { merge: true });

        await batch.commit();

        console.log("✅ QR Payment System Setup Complete!");
        console.log("\n📊 Wallet Configuration:");
        console.log("===================");
        console.log("💎 Wallet Address:", WALLET_ADDRESS);
        console.log("💎 USDT: BEP20 on BNB Smart Chain (chain id 56)");
        console.log("===================");
        console.log("\n📋 Flow:");
        console.log("  • User sends USDT (BEP20) to platform wallet");
        console.log("  • User submits tx hash → server verifies on BscScan");
        console.log("  • On success: user_investments (active) + pending_investments (approved audit) + transactions");
        console.log("  • Admin panel can still manage legacy pending rows");
        console.log("\n🔗 Deploy Firestore rules (if using CLI): firebase deploy --only firestore:rules");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

setupQrPaymentSystem();

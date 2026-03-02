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

const WALLET_ADDRESS = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";

async function setupQrPaymentSystem() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("🏗️  Setting up QR Payment System...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        // Create schema for pending_investments
        const schemaRef = doc(db, '_schema', 'pending_investments');
        batch.set(schemaRef, {
            description: 'Tracks QR code payment pending investments awaiting admin approval',
            fields: [
                'user_id', 'user_email', 'plan_id', 'plan_name', 'amount',
                'expected_return', 'wallet_address', 'status', 'payment_method',
                'transaction_id', 'proof_image_url', 'created_at', 'processed_at',
                'processed_by', 'notes'
            ],
            wallet_address: WALLET_ADDRESS,
            created_at: timestamp,
        });

        // Create platform settings for QR payments
        const qrSettingsRef = doc(db, 'platform_settings', 'qr_payment');
        batch.set(qrSettingsRef, {
            enabled: true,
            wallet_address: WALLET_ADDRESS,
            accepted_methods: ['usdt_trc20', 'eth', 'bnb'],
            usdt_network: 'TRC20',
            processing_time: '24 hours',
            min_amount: 10,
            max_amount: 1000,
            created_at: timestamp,
            updated_at: timestamp,
        });

        await batch.commit();

        console.log("✅ QR Payment System Setup Complete!");
        console.log("\n📊 Wallet Configuration:");
        console.log("===================");
        console.log("💎 Wallet Address:", WALLET_ADDRESS);
        console.log("💎 USDT Network: TRC20 (Tron)");
        console.log("💎 Accepted: USDT, ETH, BNB");
        console.log("===================");
        console.log("\n📋 Features:");
        console.log("  • User scans QR / copies wallet address");
        console.log("  • Sends crypto payment");
        console.log("  • Clicks 'I Have Sent Payment'");
        console.log("  • Admin verifies in Investment Approvals tab");
        console.log("  • Admin approves → Plan activates");
        console.log("\n🔗 Access URLs:");
        console.log("  User: http://localhost:9002/invest");
        console.log("  Admin: http://localhost:9002/admin → Investments tab");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

setupQrPaymentSystem();

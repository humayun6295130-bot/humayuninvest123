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

async function setupReferralSystem() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("🏗️  Setting up referral system...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        // 1. Referral Settings
        const settingsRef = doc(db, 'referral_settings', 'default');
        batch.set(settingsRef, {
            level1_percent: 5,
            level2_percent: 2,
            level3_percent: 1,
            min_withdrawal: 10,
            enabled: true,
            created_at: timestamp,
            updated_at: timestamp,
        });

        // 2. Create schema documents for new collections
        const collections = [
            {
                name: 'referral_bonuses',
                description: 'Tracks all referral bonuses (commission + manual)',
                fields: ['user_id', 'user_email', 'from_user_id', 'amount', 'type', 'level', 'description', 'status', 'created_at']
            },
            {
                name: 'referral_withdrawals',
                description: 'Tracks referral earnings withdrawal requests',
                fields: ['user_id', 'user_email', 'amount', 'status', 'requested_at', 'processed_at', 'processed_by']
            },
            {
                name: 'referrals',
                description: 'Tracks user referral relationships',
                fields: ['referrer_id', 'referred_user_id', 'referred_email', 'level', 'commission_percent', 'total_commission', 'status', 'created_at']
            }
        ];

        for (const coll of collections) {
            const schemaRef = doc(db, '_schema', coll.name);
            batch.set(schemaRef, {
                description: coll.description,
                fields: coll.fields,
                created_at: timestamp,
            }, { merge: true });
        }

        await batch.commit();
        console.log("✅ Referral system setup complete!");

        console.log("\n📊 Referral System Structure:");
        console.log("  • referral_settings - Commission rates and config");
        console.log("  • referrals - User referral relationships");
        console.log("  • referral_bonuses - All bonus/commission records");
        console.log("  • referral_withdrawals - Withdrawal requests");
        console.log("\n💰 Commission Rates:");
        console.log("  • Level 1 (Direct): 5%");
        console.log("  • Level 2: 2%");
        console.log("  • Level 3: 1%");
        console.log("\n✨ Features:");
        console.log("  • Manual bonus sending by admin");
        console.log("  • User withdrawal system");
        console.log("  • Complete referral tree (3 levels)");
        console.log("  • Bonus history tracking");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

setupReferralSystem();

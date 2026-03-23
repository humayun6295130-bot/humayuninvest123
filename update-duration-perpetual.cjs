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

async function updateDurationToPerpetual() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("📝 Updating investment plans to perpetual duration...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        // Update all plans to have perpetual duration (365 days)
        const plans = [
            { id: 'starter', duration_days: 365, name: 'Starter Plan' },
            { id: 'growth', duration_days: 365, name: 'Growth Plan' },
            { id: 'pro', duration_days: 730, name: 'Pro Plan' }, // 2 years
            { id: 'vip', duration_days: 1095, name: 'VIP Plan' }, // 3 years
        ];

        for (const plan of plans) {
            const planRef = doc(db, 'investment_plans', plan.id);
            batch.update(planRef, {
                duration_days: plan.duration_days,
                updated_at: timestamp
            });
            console.log(`  ✓ Updated ${plan.name}: ${plan.duration_days} days`);
        }

        await batch.commit();
        console.log("\n✅ Duration updated to perpetual successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

updateDurationToPerpetual();
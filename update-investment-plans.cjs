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

async function updateInvestmentPlans() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("🏗️  Updating investment plans...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        const plans = [
            {
                id: 'starter',
                name: 'Starter Plan',
                description: 'Perfect for beginners. Low risk, steady returns.',
                min_amount: 10,
                max_amount: 100,
                daily_roi_percent: 0.5,
                return_percent: 15,
                duration_days: 30,
                daily_return: 0.5,
                category: 'basic',
                is_active: true,
                capital_return: true,
                features: ['Daily returns', 'Instant withdrawal', 'Email notifications'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'growth',
                name: 'Growth Plan',
                description: 'Steady growth for regular investors.',
                min_amount: 100,
                max_amount: 1000,
                daily_roi_percent: 0.8,
                return_percent: 24,
                duration_days: 30,
                daily_return: 0.8,
                category: 'standard',
                is_active: true,
                capital_return: true,
                features: ['Daily returns', 'Priority withdrawal', 'Email & SMS notifications'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'pro',
                name: 'Pro Plan',
                description: 'Higher returns for experienced investors.',
                min_amount: 1000,
                max_amount: 10000,
                daily_roi_percent: 1.0,
                return_percent: 45,
                duration_days: 45,
                daily_return: 1.0,
                category: 'premium',
                is_active: true,
                capital_return: true,
                features: ['Daily returns', 'Instant withdrawal', 'Priority support', 'Bonus rewards'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'vip',
                name: 'VIP Plan',
                description: 'Maximum returns for VIP members.',
                min_amount: 10000,
                max_amount: 100000,
                daily_roi_percent: 1.2,
                return_percent: 72,
                duration_days: 60,
                daily_return: 1.2,
                category: 'vip',
                is_active: true,
                capital_return: true,
                features: ['Daily returns', 'Instant withdrawal', '24/7 VIP support', 'Exclusive bonuses', 'Personal manager'],
                created_at: timestamp,
                updated_at: timestamp,
            },
        ];

        for (const plan of plans) {
            const planRef = doc(db, 'investment_plans', plan.id);
            batch.set(planRef, plan, { merge: true });
        }

        // Create the investment_earnings collection schema document
        const earningsSchemaRef = doc(db, '_schema', 'investment_earnings');
        batch.set(earningsSchemaRef, {
            description: 'Tracks individual earning claims from investments',
            fields: ['user_id', 'investment_id', 'plan_name', 'amount', 'date', 'claimed_at'],
            created_at: timestamp,
        }, { merge: true });

        await batch.commit();
        console.log("✅ Investment plans updated successfully!");

        console.log("\n📊 Plans Summary:");
        plans.forEach(plan => {
            console.log(`  • ${plan.name}: ${plan.daily_roi_percent}% daily for ${plan.duration_days} days`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

updateInvestmentPlans();

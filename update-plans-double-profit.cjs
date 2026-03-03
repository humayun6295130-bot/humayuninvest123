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

async function updatePlans() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("🏗️  Creating new investment plans...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        // Fixed amount plans - 100% profit at end of month
        const plans = [
            {
                id: 'plan-30',
                name: 'Growth $30 Plan',
                description: 'Invest $30 and get 100% Return Guaranteed in 30 days',
                min_amount: 30,
                max_amount: 30,
                fixed_amount: 30,
                daily_roi_percent: 0,
                return_percent: 100,
                duration_days: 30,
                total_return: 60,
                profit_amount: 30,
                payout_schedule: 'end_of_term',
                category: 'fixed',
                is_active: true,
                capital_return: true,
                features: ['100% Return Guaranteed', 'Fixed $30 Investment', 'Daily Profit Claim', 'Capital Protection'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'plan-50',
                name: 'Pro $50 Plan',
                description: 'Invest $50 and get 100% Return Guaranteed in 30 days',
                min_amount: 50,
                max_amount: 50,
                fixed_amount: 50,
                daily_roi_percent: 0,
                return_percent: 100,
                duration_days: 30,
                total_return: 100,
                profit_amount: 50,
                payout_schedule: 'end_of_term',
                category: 'fixed',
                is_active: true,
                capital_return: true,
                features: ['100% Return Guaranteed', 'Fixed $50 Investment', 'Daily Profit Claim', 'Capital Protection'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'plan-100',
                name: 'Elite $100 Plan',
                description: 'Invest $100 and get 100% Return Guaranteed in 30 days',
                min_amount: 100,
                max_amount: 100,
                fixed_amount: 100,
                daily_roi_percent: 0,
                return_percent: 100,
                duration_days: 30,
                total_return: 200,
                profit_amount: 100,
                payout_schedule: 'end_of_term',
                category: 'fixed',
                is_active: true,
                capital_return: true,
                features: ['100% Return Guaranteed', 'Fixed $100 Investment', 'Daily Profit Claim', 'Capital Protection', 'VIP Support'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'custom-plan',
                name: 'Custom Plan',
                description: 'Choose any amount $30-$10000 with 100% Return Guaranteed',
                min_amount: 30,
                max_amount: 10000,
                custom_amount: true,
                daily_roi_percent: 0,
                return_percent: 100,
                duration_days: 30,
                payout_schedule: 'end_of_term',
                category: 'custom',
                is_active: true,
                capital_return: true,
                features: ['100% Return Guaranteed', 'Custom Investment Amount', 'Daily Profit Claim', 'Capital Protection', 'Flexible $30-$10000'],
                created_at: timestamp,
                updated_at: timestamp,
            },
        ];

        for (const plan of plans) {
            const planRef = doc(db, 'investment_plans', plan.id);
            batch.set(planRef, plan, { merge: true });
        }

        // Deactivate old plans
        const oldPlans = ['starter', 'growth', 'pro', 'vip', 'plan-20', 'plan-25', 'elite', 'premium'];
        for (const oldId of oldPlans) {
            const oldRef = doc(db, 'investment_plans', oldId);
            batch.set(oldRef, { is_active: false, updated_at: timestamp }, { merge: true });
        }

        await batch.commit();
        console.log("✅ Investment plans updated successfully!");

        console.log("\n📊 NEW PLANS:");
        console.log("===================");
        console.log("✅ $30 Plan → $60 at month end (100% profit)");
        console.log("✅ $50 Plan → $100 at month end (100% profit)");
        console.log("✅ $100 Plan → $200 at month end (100% profit)");
        console.log("✅ Custom Plan → $30-$10000");
        console.log("===================");
        console.log("\n💡 Features:");
        console.log("  • No daily ROI - All profit at end of 30 days");
        console.log("  • 100% guaranteed return");
        console.log("  • Capital returned + Profit");
        console.log("  • Fixed amounts for $30, $50, $100");
        console.log("  • Custom amount option available ($30-$10000)");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

updatePlans();

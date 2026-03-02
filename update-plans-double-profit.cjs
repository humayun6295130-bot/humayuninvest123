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

        // Fixed amount plans - Double profit at end of month (100% return)
        const plans = [
            {
                id: 'plan-20',
                name: 'Starter $20 Plan',
                description: 'Invest $20 and get $40 at month end (100% profit)',
                min_amount: 20,
                max_amount: 20,
                fixed_amount: 20,
                daily_roi_percent: 0, // No daily ROI, all at end
                return_percent: 100, // 100% total return (double)
                duration_days: 30,
                total_return: 40, // $20 + $20 profit
                profit_amount: 20,
                payout_schedule: 'end_of_term', // All at end
                category: 'fixed',
                is_active: true,
                capital_return: true,
                features: ['Double your money', 'Fixed $20 investment', '30 days duration', 'Guaranteed return'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'plan-30',
                name: 'Growth $30 Plan',
                description: 'Invest $30 and get $60 at month end (100% profit)',
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
                features: ['Double your money', 'Fixed $30 investment', '30 days duration', 'Guaranteed return'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'plan-50',
                name: 'Pro $50 Plan',
                description: 'Invest $50 and get $100 at month end (100% profit)',
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
                features: ['Double your money', 'Fixed $50 investment', '30 days duration', 'Guaranteed return'],
                created_at: timestamp,
                updated_at: timestamp,
            },
            {
                id: 'custom-plan',
                name: 'Custom Plan',
                description: 'Choose your amount (Min $10, Max $1000) - Double at month end',
                min_amount: 10,
                max_amount: 1000,
                custom_amount: true,
                daily_roi_percent: 0,
                return_percent: 100,
                duration_days: 30,
                payout_schedule: 'end_of_term',
                category: 'custom',
                is_active: true,
                capital_return: true,
                features: ['Double your money', 'Custom amount', '30 days duration', 'Guaranteed return', 'Flexible investment'],
                created_at: timestamp,
                updated_at: timestamp,
            },
        ];

        for (const plan of plans) {
            const planRef = doc(db, 'investment_plans', plan.id);
            batch.set(planRef, plan, { merge: true });
        }

        // Deactivate old plans
        const oldPlans = ['starter', 'growth', 'pro', 'vip'];
        for (const oldId of oldPlans) {
            const oldRef = doc(db, 'investment_plans', oldId);
            batch.set(oldRef, { is_active: false, updated_at: timestamp }, { merge: true });
        }

        await batch.commit();
        console.log("✅ Investment plans updated successfully!");

        console.log("\n📊 NEW PLANS:");
        console.log("===================");
        console.log("✅ $20 Plan → $40 at month end (100% profit)");
        console.log("✅ $30 Plan → $60 at month end (100% profit)");
        console.log("✅ $50 Plan → $100 at month end (100% profit)");
        console.log("✅ Custom Plan → $10-$1000, double at month end");
        console.log("===================");
        console.log("\n💡 Features:");
        console.log("  • No daily ROI - All profit at end of 30 days");
        console.log("  • 100% guaranteed return (double your money)");
        console.log("  • Capital returned + Profit");
        console.log("  • Fixed amounts for $20, $30, $50");
        console.log("  • Custom amount option available");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

updatePlans();

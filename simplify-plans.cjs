const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch, deleteDoc, collection, getDocs } = require('firebase/firestore');

// Firebase configuration - MUST use environment variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
    console.error('❌ Error: Firebase configuration is missing. Please set environment variables.');
    console.error('Required: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_DATABASE_URL, FIREBASE_PROJECT_ID');
    process.exit(1);
}

async function simplifyPlans() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("🗑️  Removing all existing investment plans...");

        // First, get all existing plans
        const plansSnapshot = await getDocs(collection(db, 'investment_plans'));
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        console.log(`Found ${plansSnapshot.size} existing plans`);

        // Delete all existing plans
        plansSnapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            console.log(`  🗑️  Deleting: ${docSnap.id}`);
        });

        // Create a single unified plan with minimum deposit of 30
        const unifiedPlan = {
            id: 'unified-plan',
            name: 'Investment Plan',
            description: 'Simple investment plan with 100% return in 30 days. Minimum deposit: $30',
            min_amount: 30,
            max_amount: 10000,
            daily_roi_percent: 0,
            return_percent: 100,
            duration_days: 30,
            payout_schedule: 'end_of_term',
            category: 'unified',
            is_active: true,
            capital_return: true,
            custom_amount: true,
            features: [
                '100% Return Guaranteed',
                'Minimum $30 Deposit',
                'Up to 60X',
                'Capital Protection',
                'Simple & Easy'
            ],
            created_at: timestamp,
            updated_at: timestamp,
        };

        // Set the unified plan
        const planRef = doc(db, 'investment_plans', 'unified-plan');
        batch.set(planRef, unifiedPlan);

        await batch.commit();

        console.log("\n✅ Plans simplified successfully!");
        console.log("=================================");
        console.log("📊 NEW PLAN STRUCTURE:");
        console.log("  • Single unified plan");
        console.log("  • Minimum deposit: $30");
        console.log("  • Maximum deposit: $10,000");
        console.log("  • 100% return in 30 days");
        console.log("=================================");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

simplifyPlans();

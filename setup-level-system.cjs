const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, getDocs, updateDoc } = require('firebase/firestore');

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

// Level configuration
const LEVEL_CONFIG = [
    { level: 1, min: 30, max: 250, income_percent: 1.5, name: 'Starter' },
    { level: 2, min: 251, max: 500, income_percent: 2.0, name: 'Basic' },
    { level: 3, min: 501, max: 1000, income_percent: 2.5, name: 'Silver' },
    { level: 4, min: 1001, max: 5000, income_percent: 3.1, name: 'Gold' },
    { level: 5, min: 5001, max: 10000, income_percent: 4.0, name: 'VIP' }
];

// Function to calculate level based on balance
function getLevelFromBalance(balance) {
    for (const config of LEVEL_CONFIG) {
        if (balance >= config.min && balance <= config.max) {
            return config;
        }
    }
    // If balance > 10000, still level 5
    if (balance > 10000) {
        return LEVEL_CONFIG[4];
    }
    // If balance < 30, level 1
    return LEVEL_CONFIG[0];
}

async function setupLevelSystem() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("📊 Setting up level system...");

        // Get all users using query
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        console.log(`Found ${snapshot.size} users`);

        const timestamp = new Date().toISOString();
        let updatedCount = 0;

        // Update each user with level system fields
        for (const userDoc of snapshot.docs) {
            const userData = userDoc.data();
            const balance = userData.balance || 0;
            const levelConfig = getLevelFromBalance(balance);

            // Only update if fields don't exist or need updating
            if (userData.current_level === undefined || userData.income_percent === undefined) {
                const updateData = {
                    current_level: levelConfig.level,
                    income_percent: levelConfig.income_percent,
                    level_name: levelConfig.name,
                    last_level_update: timestamp,
                    total_team_commission: userData.total_team_commission || 0,
                    last_daily_earning_date: null
                };

                await updateDoc(userDoc.ref, updateData);
                updatedCount++;
                console.log(`  ✅ Updated user ${userDoc.id}: Level ${levelConfig.level} (${levelConfig.name})`);
            }
        }

        // Save level configuration to a settings document
        const settingsRef = doc(db, 'settings', 'level_system');
        await setDoc(settingsRef, {
            levels: LEVEL_CONFIG,
            updated_at: timestamp
        }, { merge: true });

        console.log("\n✅ Level system setup complete!");
        console.log("=================================");
        console.log(`📊 Updated ${updatedCount} users with level system`);
        console.log("\n📈 Level Structure:");
        LEVEL_CONFIG.forEach(config => {
            console.log(`  Level ${config.level} (${config.name}): $${config.min}-$${config.max} → ${config.income_percent}% daily`);
        });
        console.log("=================================");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

setupLevelSystem();

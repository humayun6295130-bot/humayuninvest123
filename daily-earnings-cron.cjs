/**
 * Daily Earnings Cron Job
 * 
 * This script calculates and adds daily earnings for all users based on their level.
 * It should be run daily (e.g., at midnight) using a scheduler like cron or node-cron.
 * 
 * Environment Variables Required:
 *   FIREBASE_API_KEY
 *   FIREBASE_AUTH_DOMAIN
 *   FIREBASE_DATABASE_URL
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_STORAGE_BUCKET
 *   FIREBASE_MESSAGING_SENDER_ID
 *   FIREBASE_APP_ID
 *   FIREBASE_MEASUREMENT_ID
 * 
 * Level Structure:
 * Level 1: $30-$250 → 1.5% daily
 * Level 2: $251-$500 → 2.0% daily
 * Level 3: $501-$1000 → 2.5% daily
 * Level 4: $1001-$5000 → 3.1% daily
 * Level 5: $5001-$10000 → 4.0% daily
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, getDocs, updateDoc, query, where, startAfter, limit } = require('firebase/firestore');

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
if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
    console.error('❌ Error: Firebase configuration is missing. Please set environment variables.');
    console.error('Required: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_DATABASE_URL, FIREBASE_PROJECT_ID');
    process.exit(1);
}

// Level configuration - MUST match src/lib/level-config.ts
// ⚠️ IMPORTANT: If you update this file, you MUST also update the TypeScript config
const LEVEL_CONFIG = [
    { level: 1, min: 30, max: 250, income_percent: 1.5, name: 'Starter' },
    { level: 2, min: 251, max: 500, income_percent: 2.0, name: 'Basic' },
    { level: 3, min: 501, max: 1000, income_percent: 2.5, name: 'Silver' },
    { level: 4, min: 1001, max: 2500, income_percent: 3.1, name: 'Gold' },
    { level: 5, min: 5000, max: 10000, income_percent: 4.0, name: 'VIP' }
];

// Function to calculate level based on balance
function getLevelFromBalance(balance) {
    for (const config of LEVEL_CONFIG) {
        if (balance >= config.min && balance <= config.max) {
            return config;
        }
    }
    if (balance > 10000) return LEVEL_CONFIG[4];
    return LEVEL_CONFIG[0];
}

// Batch size for processing users (prevents timeout)
const BATCH_SIZE = 100;

async function runDailyEarnings() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const today = new Date().toISOString().split('T')[0];
        console.log(`\n📅 Running daily earnings for: ${today}`);
        console.log("=================================");

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        let lastDoc = null;
        let totalProcessed = 0;
        let hasMore = true;

        // Process users in batches using pagination
        while (hasMore) {
            // Build query with pagination cursor
            let usersQuery = query(
                collection(db, 'users'),
                where('balance', '>=', 30), // Only get users with minimum balance
                limit(BATCH_SIZE)
            );

            // Add cursor for subsequent batches
            if (lastDoc) {
                usersQuery = query(usersQuery, startAfter(lastDoc));
            }

            const snapshot = await getDocs(usersQuery);

            if (snapshot.empty) {
                hasMore = false;
                break;
            }

            console.log(`\n📦 Processing batch of ${snapshot.size} users...`);

            // Process each user in the batch
            for (const userDoc of snapshot.docs) {
                try {
                    const userData = userDoc.data();
                    const balance = userData.balance || 0;

                    // Skip users with balance less than minimum
                    if (balance < 30) {
                        skipCount++;
                        continue;
                    }

                    // Check if auto daily earnings is enabled for this user
                    // Default to true if not set
                    const autoDailyEarnings = userData.auto_daily_earnings !== false;

                    if (!autoDailyEarnings) {
                        console.log(`  ⏭️  Skipping ${userDoc.id}: Auto daily earnings disabled`);
                        skipCount++;
                        continue;
                    }

                    // Get current level
                    let levelConfig = getLevelFromBalance(balance);

                    // Check if auto level upgrade is enabled for this user
                    const autoLevelUpgrade = userData.auto_level_upgrade !== false;

                    // Auto upgrade level if enabled and balance qualifies
                    if (autoLevelUpgrade && levelConfig.level < 5) {
                        const nextLevelConfig = LEVEL_CONFIG[levelConfig.level];
                        if (balance >= nextLevelConfig.min) {
                            // Upgrade to next level
                            levelConfig = nextLevelConfig;
                            console.log(`  ⬆️  Auto-upgraded user ${userDoc.id} to Level ${levelConfig.level} (${levelConfig.name})`);
                        }
                    }

                    // Check if already claimed today
                    if (userData.last_daily_earning_date === today) {
                        skipCount++;
                        continue;
                    }

                    // Calculate daily earnings
                    const dailyEarnings = (balance * levelConfig.income_percent) / 100;

                    // Update user balance and record
                    const newBalance = balance + dailyEarnings;
                    const newTotalEarned = (userData.total_earned || 0) + dailyEarnings;

                    await updateDoc(userDoc.ref, {
                        balance: newBalance,
                        total_earned: newTotalEarned,
                        last_daily_earning_date: today,
                        current_level: levelConfig.level,
                        income_percent: levelConfig.income_percent,
                        level_name: levelConfig.name
                    });

                    // Record daily earnings in log
                    const earningsLogRef = doc(collection(db, 'daily_earnings_log'));
                    await setDoc(earningsLogRef, {
                        user_id: userDoc.id,
                        amount: dailyEarnings,
                        balance_before: balance,
                        balance_after: newBalance,
                        income_percent: levelConfig.income_percent,
                        level: levelConfig.level,
                        date: today,
                        created_at: new Date().toISOString()
                    });

                    successCount++;

                } catch (error) {
                    console.error(`  ❌ Error processing ${userDoc.id}:`, error.message);
                    errorCount++;
                }
            }

            // Update cursor for next batch
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            totalProcessed += snapshot.docs.length;

            // Check if we've processed all users
            if (snapshot.size < BATCH_SIZE) {
                hasMore = false;
            }

            console.log(`  Progress: ${totalProcessed} users processed so far...`);
        }

        console.log("\n=================================");
        console.log("📊 Daily Earnings Summary:");
        console.log(`  ✅ Success: ${successCount}`);
        console.log(`  ⏭️  Skipped: ${skipCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📋 Total Processed: ${totalProcessed}`);
        console.log("=================================");

        if (errorCount > 0) {
            console.log("\n⚠️  Some users encountered errors. Check logs above.");
            process.exit(1);
        }

        console.log("\n✨ Daily earnings completed successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }
}

// Run the daily earnings function
runDailyEarnings();

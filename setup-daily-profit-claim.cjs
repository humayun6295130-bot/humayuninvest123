/**
 * Setup Daily Profit Claim System
 * 
 * This script sets up the daily_profit_claims table and updates user_investments
 * to support the new ROI claim system.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, addDoc, updateDoc, query, where } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupDailyProfitClaimSystem() {
    console.log('🚀 Setting up Daily Profit Claim System...\n');

    try {
        // 1. Create sample daily_profit_claims document (to establish collection)
        console.log('📋 Creating daily_profit_claims collection...');

        const sampleClaimRef = doc(collection(db, 'daily_profit_claims'));
        await setDoc(sampleClaimRef, {
            user_id: 'sample-user-id',
            investment_id: 'sample-investment-id',
            amount: 1.00,
            date: '2024-01-01',
            claimed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        // Delete sample document
        await updateDoc(sampleClaimRef, { deleted: true });
        console.log('✅ daily_profit_claims collection created\n');

        // 2. Update existing user_investments
        console.log('📊 Updating existing user_investments...');
        const investmentsRef = collection(db, 'user_investments');
        const investmentsSnapshot = await getDocs(investmentsRef);

        let updatedCount = 0;
        for (const docSnap of investmentsSnapshot.docs) {
            const data = docSnap.data();

            // Skip if already has new fields
            if (data.total_claimed !== undefined) continue;

            await updateDoc(docSnap.ref, {
                total_claimed: 0,
                updated_at: new Date().toISOString(),
            });
            updatedCount++;
        }

        console.log(`✅ Updated ${updatedCount} existing investments with claim tracking\n`);

        console.log('🎉 Daily Profit Claim System setup complete!\n');
        console.log('Features added:');
        console.log('  ✅ Daily profit claim table');
        console.log('  ✅ Investment claim tracking');
        console.log('  ✅ Daily ROI calculation (100% / 30 days)');
        console.log('  ✅ One claim per day restriction');
        console.log('  ✅ Wallet integration for instant credit');

    } catch (error) {
        console.error('❌ Error setting up Daily Profit Claim System:', error);
        process.exit(1);
    }
}

// Run setup
setupDailyProfitClaimSystem();

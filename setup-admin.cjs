const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, writeBatch } = require('firebase/firestore');

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

// Admin user details
const ADMIN_EMAIL = "humayunlbb@gmail.com";
const ADMIN_PASSWORD = "96472363";

async function setupAdmin() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        console.log("👤 Creating admin user...");
        let userCredential;
        try {
            userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
            console.log("✅ Admin user created successfully!");
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log("⚠️  User already exists, proceeding with database setup...");
                // We'll still set up the database
            } else {
                throw error;
            }
        }

        const uid = userCredential?.user?.uid || null;

        if (uid) {
            console.log("📝 Setting up admin user profile...");
            const timestamp = new Date().toISOString();

            await setDoc(doc(db, 'users', uid), {
                email: ADMIN_EMAIL,
                role: 'super_admin',
                username: 'admin',
                display_name: 'System Administrator',
                bio: 'Platform super administrator',
                is_public: false,
                kyc_status: 'verified',
                kyc_verified_at: timestamp,
                email_notifications: true,
                investment_alerts: true,
                deposit_alerts: true,
                withdrawal_alerts: true,
                marketing_emails: false,
                price_alerts: true,
                preferred_currency: 'USD',
                preferred_language: 'en',
                theme: 'system',
                show_balance: true,
                show_activity: false,
                phone_verified: true,
                created_at: timestamp,
                updated_at: timestamp,
            });
            console.log("✅ Admin profile created!");
        }

        console.log("🏗️  Setting up database collections...");
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        // Create initial settings document
        const settingsRef = doc(db, 'platform_settings', 'general');
        batch.set(settingsRef, {
            platform_name: 'InvestPro',
            default_currency: 'USD',
            min_deposit: 10,
            withdrawal_fee_percent: 2,
            maintenance_mode: false,
            allow_new_registrations: true,
            created_at: timestamp,
            updated_at: timestamp,
        });

        // Create investment plans document
        const plans = [
            {
                id: 'starter',
                name: 'Starter Plan',
                description: 'Perfect for beginners',
                min_amount: 10,
                max_amount: 100,
                return_percent: 5,
                duration_days: 30,
                daily_return: 0.17,
                category: 'basic',
                is_active: true,
                created_at: timestamp,
            },
            {
                id: 'growth',
                name: 'Growth Plan',
                description: 'Steady growth for regular investors',
                min_amount: 100,
                max_amount: 1000,
                return_percent: 8,
                duration_days: 30,
                daily_return: 0.27,
                category: 'standard',
                is_active: true,
                created_at: timestamp,
            },
            {
                id: 'pro',
                name: 'Pro Plan',
                description: 'Higher returns for experienced investors',
                min_amount: 1000,
                max_amount: 10000,
                return_percent: 12,
                duration_days: 45,
                daily_return: 0.27,
                category: 'premium',
                is_active: true,
                created_at: timestamp,
            },
            {
                id: 'vip',
                name: 'VIP Plan',
                description: 'Maximum returns for VIP members',
                min_amount: 10000,
                max_amount: 100000,
                return_percent: 18,
                duration_days: 60,
                daily_return: 0.30,
                category: 'vip',
                is_active: true,
                created_at: timestamp,
            },
        ];

        for (const plan of plans) {
            const planRef = doc(db, 'investment_plans', plan.id);
            batch.set(planRef, plan);
        }

        await batch.commit();
        console.log("✅ Database collections created!");

        console.log("\n🎉 Setup Complete!");
        console.log("===================");
        console.log("Admin Email:", ADMIN_EMAIL);
        console.log("Admin Password:", ADMIN_PASSWORD);
        if (uid) {
            console.log("Admin UID:", uid);
        }
        console.log("\nYou can now login at: http://localhost:9002/login");
        console.log("===================");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

setupAdmin();

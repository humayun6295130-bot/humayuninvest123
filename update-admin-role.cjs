const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, collection, writeBatch } = require('firebase/firestore');

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

async function updateAdminRole() {
    try {
        console.log("🔥 Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        console.log("👤 Signing in to get user info...");
        const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        const uid = userCredential.user.uid;
        console.log("✅ User found with UID:", uid);

        console.log("📝 Updating admin role in database...");
        const timestamp = new Date().toISOString();

        // Check if user document exists
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Update existing user
            await setDoc(userRef, {
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
                updated_at: timestamp,
            }, { merge: true });
            console.log("✅ Existing user updated to super_admin!");
        } else {
            // Create new user document
            await setDoc(userRef, {
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
            console.log("✅ New admin profile created!");
        }

        console.log("🏗️  Setting up full database structure...");
        const batch = writeBatch(db);

        // 1. Platform Settings
        const settingsRef = doc(db, 'platform_settings', 'general');
        batch.set(settingsRef, {
            platform_name: 'InvestPro',
            default_currency: 'USD',
            min_deposit: 10,
            withdrawal_fee_percent: 2,
            maintenance_mode: false,
            allow_new_registrations: true,
            contact_email: 'support@investpro.com',
            social_links: {
                telegram: 'https://t.me/investpro',
                facebook: 'https://facebook.com/investpro',
                twitter: 'https://twitter.com/investpro',
            },
            created_at: timestamp,
            updated_at: timestamp,
        }, { merge: true });

        // 2. Investment Plans
        const plans = [
            {
                id: 'starter',
                name: 'Starter Plan',
                description: 'Perfect for beginners. Low risk, steady returns.',
                min_amount: 10,
                max_amount: 100,
                return_percent: 5,
                duration_days: 30,
                daily_return: 0.17,
                category: 'basic',
                is_active: true,
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
                return_percent: 8,
                duration_days: 30,
                daily_return: 0.27,
                category: 'standard',
                is_active: true,
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
                return_percent: 12,
                duration_days: 45,
                daily_return: 0.27,
                category: 'premium',
                is_active: true,
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
                return_percent: 18,
                duration_days: 60,
                daily_return: 0.30,
                category: 'vip',
                is_active: true,
                features: ['Daily returns', 'Instant withdrawal', '24/7 VIP support', 'Exclusive bonuses', 'Personal manager'],
                created_at: timestamp,
                updated_at: timestamp,
            },
        ];

        for (const plan of plans) {
            const planRef = doc(db, 'investment_plans', plan.id);
            batch.set(planRef, plan, { merge: true });
        }

        // 3. Content Categories
        const categories = [
            { id: 'news', name: 'News', description: 'Latest platform news and updates', icon: 'newspaper' },
            { id: 'guide', name: 'Investment Guides', description: 'How-to guides and tutorials', icon: 'book' },
            { id: 'analysis', name: 'Market Analysis', description: 'Expert market analysis and insights', icon: 'chart' },
            { id: 'announcement', name: 'Announcements', description: 'Important platform announcements', icon: 'megaphone' },
        ];

        for (const cat of categories) {
            const catRef = doc(db, 'content_categories', cat.id);
            batch.set(catRef, { ...cat, created_at: timestamp, updated_at: timestamp }, { merge: true });
        }

        // 4. Support Ticket Categories
        const ticketCategories = [
            { id: 'general', name: 'General Inquiry', priority: 'low' },
            { id: 'deposit', name: 'Deposit Issue', priority: 'high' },
            { id: 'withdrawal', name: 'Withdrawal Issue', priority: 'high' },
            { id: 'investment', name: 'Investment Question', priority: 'medium' },
            { id: 'technical', name: 'Technical Support', priority: 'medium' },
            { id: 'account', name: 'Account Issue', priority: 'high' },
            { id: 'kyc', name: 'KYC/Verification', priority: 'medium' },
        ];

        for (const ticketCat of ticketCategories) {
            const ticketRef = doc(db, 'ticket_categories', ticketCat.id);
            batch.set(ticketRef, { ...ticketCat, created_at: timestamp, updated_at: timestamp }, { merge: true });
        }

        // 5. Daily Bonus Settings
        const dailyBonusRef = doc(db, 'platform_settings', 'daily_bonus');
        batch.set(dailyBonusRef, {
            enabled: true,
            min_amount: 0.5,
            max_amount: 5.0,
            cooldown_hours: 24,
            created_at: timestamp,
            updated_at: timestamp,
        }, { merge: true });

        // 6. Referral Settings
        const referralRef = doc(db, 'platform_settings', 'referral');
        batch.set(referralRef, {
            enabled: true,
            commission_percent: 5,
            levels: 3,
            level_commissions: [5, 2, 1], // Level 1: 5%, Level 2: 2%, Level 3: 1%
            min_withdrawal: 10,
            created_at: timestamp,
            updated_at: timestamp,
        }, { merge: true });

        await batch.commit();
        console.log("✅ Full database structure created!");

        console.log("\n🎉 Admin Setup Complete!");
        console.log("===================");
        console.log("✅ Admin Email:", ADMIN_EMAIL);
        console.log("✅ Admin Password:", ADMIN_PASSWORD);
        console.log("✅ Admin UID:", uid);
        console.log("✅ Role: super_admin");
        console.log("\n📊 Database Collections Created:");
        console.log("  - users (admin profile)");
        console.log("  - platform_settings");
        console.log("  - investment_plans (4 plans)");
        console.log("  - content_categories");
        console.log("  - ticket_categories");
        console.log("\n🔗 Login URL: http://localhost:9002/login");
        console.log("🔗 Admin Panel: http://localhost:9002/admin");
        console.log("===================");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.code === 'auth/wrong-password') {
            console.error("   The password provided is incorrect.");
        } else if (error.code === 'auth/user-not-found') {
            console.error("   User not found. Please run setup-admin.cjs first.");
        }
        console.error(error);
        process.exit(1);
    }
}

updateAdminRole();

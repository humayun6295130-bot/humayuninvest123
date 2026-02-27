import fs from 'fs';
import { Client } from 'pg';

async function fixRls() {
    const password = process.argv[2];

    if (!password) {
        console.error("Please provide the database password as an argument.");
        process.exit(1);
    }

    const connectionString = `postgresql://postgres:${password}@db.elchwllzsvycnasvbeqx.supabase.co:5432/postgres`;

    const client = new Client({
        connectionString,
    });

    try {
        console.log("Connecting to Supabase database...");
        await client.connect();

        const sql = `
      -- Allow users to insert themselves into roles_admin during registration
      CREATE POLICY "Users can insert own admin role" ON public.roles_admin FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can view own admin role" ON public.roles_admin FOR SELECT USING (auth.uid() = user_id);
      
      -- Let admins see all users
      CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.roles_admin WHERE user_id = auth.uid())
      );
    `;

        console.log("Executing SQL fix...");
        await client.query(sql);

        console.log("✅ RLS Fix applied successfully!");
    } catch (err) {
        console.error("❌ Error applying fix:", err.message);
    } finally {
        await client.end();
    }
}

fixRls();

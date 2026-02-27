import fs from 'fs';
import { Client } from 'pg';
import path from 'path';

async function runSchema() {
    const password = process.argv[2];

    if (!password) {
        console.error("Please provide the database password as an argument.");
        process.exit(1);
    }

    // Supabase connection string format
    const connectionString = `postgresql://postgres:${password}@db.elchwllzsvycnasvbeqx.supabase.co:5432/postgres`;

    const client = new Client({
        connectionString,
    });

    try {
        console.log("Connecting to Supabase database...");
        await client.connect();

        const schemaPath = path.join(process.cwd(), 'supabase-schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("Executing schema SQL...");
        await client.query(schemaSql);

        console.log("✅ Schema executed successfully! All tables and policies have been created.");
    } catch (err) {
        console.error("❌ Error executing schema:", err);
    } finally {
        await client.end();
    }
}

runSchema();

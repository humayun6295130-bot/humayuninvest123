const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const supabase = createClient(url, key);

async function testSign() {
    const { data, error } = await supabase.auth.signUp({
        email: 'test_node@example.com',
        password: 'password123'
    });

    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("SUPABASE SUCCESS:", data);
    }
}

testSign();

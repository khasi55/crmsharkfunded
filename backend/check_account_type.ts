
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
    console.log("Checking Account 889228516...");

    // Search by login (it's a number, but usually stored as number or string)
    // trying both eq first
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', 889228516)
        .single();

    if (error) {
        console.error("Error finding account:", error.message);
        return;
    }

    if (data) {
        console.log(`\nAccount Found:`);
        console.log(`- Login: ${data.login}`);
        console.log(`- Type: ${data.challenge_type}`);
        console.log(`- Group: ${data.group}`);
        console.log(`- Plan: ${data.plan_type}`); // Assuming plan_type column exists
        console.log(`- Metadata:`, data.metadata);
    }
}

checkAccount();

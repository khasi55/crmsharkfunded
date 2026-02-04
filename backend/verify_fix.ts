
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env file manually relative to this script
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

async function verifyFix() {
    console.log("Verifying Risk Rules for 'demo\\SF\\0-Pro'...");

    // We search for the specific group "demo\SF\0-Pro"
    // Note: The DB likely stores it with single backslashes if standard text, 
    // but often people put double backslashes in code to escape. 
    // Let's use ILIKE to find it.

    // List ALL groups with 'Pro' in the name
    const { data: allGroups, error } = await supabase
        .from('mt5_risk_groups')
        .select('*')
        .ilike('group_name', '%Pro%');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${allGroups.length} groups with 'Pro':`);
        allGroups.forEach(g => {
            console.log(` - Name: '${g.group_name}' | Max: ${g.max_drawdown_percent}% | Daily: ${g.daily_drawdown_percent}%`);
        });
    }

    // Check Specific User Account
    const { data: specificAccount } = await supabase
        .from('challenges')
        .select('login, group')
        .like('id', '14f14cba%')
        .single();

    if (specificAccount) {
        console.log(`\nAccount 14f14cba linked to Group: '${specificAccount.group}'`);
    } else {
        console.log("\nAccount 14f14cba not found.");
    }

    // Check User Challenge Group
    const { data: challenges } = await supabase.from('challenges').select('login, group').limit(5);
    if (challenges && challenges.length > 0) {
        console.log("\nSample User Accounts Groups:");
        challenges.forEach(c => console.log(` - Login: ${c.login} | Group: '${c.group}'`));
    }
}

verifyFix();

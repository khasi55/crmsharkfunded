
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkUserData() {
    const userId = 'e90055f2-5f5d-41c2-9f40-f5146a5d730d';
    console.log(`🕵️ Hunting for User ID: ${userId} in public tables...`);

    // 1. Check userslist (Public Profile)
    const { data: profile } = await supabase.from('userslist').select('*').eq('auth_user_id', userId).maybeSingle();

    // 2. Check mt5_accounts
    const { data: accounts } = await supabase.from('mt5_accounts').select('login').eq('user_id', userId);

    console.log("\n📊 RESULTS:");
    console.log(`- Found in 'userslist'? ${profile ? 'YES ✅' : 'NO ❌'}`);
    if (profile) console.log("  Name:", profile.name);

    console.log(`- Found in 'mt5_accounts'? ${accounts && accounts.length > 0 ? 'YES ✅' : 'NO ❌'}`);
    if (accounts) console.log(`  Count: ${accounts.length} accounts found.`);

    if (profile || (accounts && accounts.length > 0)) {
        console.log("\n👀 CONCLUSION:");
        console.log("The user data EXISTS in your app checks, which is why 'everything is showing'.");
        console.log("BUT the user is DELETED from Supabase Auth (Login system).");
        console.log("This is a 'Zombie User' state.");
    } else {
        console.log("\n❓ Weird. Only your browser thinks this user exists.");
    }
}

checkUserData();

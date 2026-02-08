
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function compareUsers() {
    const socketUser = 'bc233390-0e10-41b5-bdb6-2af66edd6af8';
    const failingUser = 'e90055f2-5f5d-41c2-9f40-f5146a5d730d';

    console.log("🕵️ COMPARING USERS:\n");

    // 1. Check Socket User (bc23...)
    console.log(`🔹 Checking Socket User: ${socketUser}`);
    const { data: socketAuth, error: socketAuthErr } = await supabase.auth.admin.getUserById(socketUser);
    if (socketAuth && socketAuth.user) {
        console.log(`   ✅ Exists in Auth? YES (${socketAuth.user.email})`);
    } else {
        console.log(`   ❌ Exists in Auth? NO`);
    }

    const { data: socketAccounts } = await supabase.from('mt5_accounts').select('login').eq('user_id', socketUser);
    console.log(`   📊 MT5 Accounts: ${socketAccounts ? socketAccounts.length : 0}`);


    // 2. Check Failing User (e900...)
    console.log(`\n🔸 Checking Failing User: ${failingUser}`);
    const { data: failAuth, error: failAuthErr } = await supabase.auth.admin.getUserById(failingUser);
    if (failAuth && failAuth.user) {
        console.log(`   ✅ Exists in Auth? YES (${failAuth.user.email})`);
    } else {
        console.log(`   ❌ Exists in Auth? NO (Deleted/Missing)`);
    }

    const { data: failAccounts } = await supabase.from('mt5_accounts').select('login').eq('user_id', failingUser);
    console.log(`   📊 MT5 Accounts: ${failAccounts ? failAccounts.length : 0}`);

    console.log("\n💡 CONCLUSION:");
    if (socketAuth?.user && !failAuth?.user) {
        console.log("   You are actually User A (Socket), but your Wallet Save is trying to use User B (Ghost).");
        console.log("   Your browser has a STALE TOKEN for User B.");
    }
}

compareUsers();

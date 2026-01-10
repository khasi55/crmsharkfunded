import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/Users/viswanathreddy/Desktop/Sharkfunded/crmsharkfunded/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAccounts() {
    console.log("🔍 Checking for poisoned accounts (where start_of_day_equity != initial_balance)...");

    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('id, login, initial_balance, start_of_day_equity, status')
        .eq('status', 'active');

    if (error) {
        console.error("Error fetching accounts:", error);
        return;
    }

    const poisoned = accounts.filter(a => a.start_of_day_equity !== a.initial_balance);

    if (poisoned.length === 0) {
        console.log("✅ No poisoned accounts found.");
    } else {
        console.log(`⚠️ Found ${poisoned.length} accounts with mismatched equity!`);
        for (const a of poisoned) {
            console.log(`   - Login ${a.login}: Initial=${a.initial_balance}, SOD=${a.start_of_day_equity}`);

            // Fix it
            const { error: updateError } = await supabase
                .from('challenges')
                .update({
                    start_of_day_equity: a.initial_balance,
                    status: 'active' // Ensure it's active if it was accidentally failed
                })
                .eq('id', a.id);

            if (updateError) console.error(`   ❌ Failed to fix ${a.login}:`, updateError.message);
            else console.log(`   ✅ Restored ${a.login} to ${a.initial_balance}`);
        }
    }

    // Special fix for 566948 if it was marked failed
    const { data: target } = await supabase.from('challenges').select('status').eq('login', 566948).single();
    if (target && target.status === 'failed') {
        console.log("♻️ Resetting 566948 status to active...");
        await supabase.from('challenges').update({ status: 'active' }).eq('login', 566948);
    }
}

fixAccounts();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function forcePass(login: number) {
    console.log(`Forcing pass for account: ${login}`);

    const { data: challenge, error: fetchErr } = await supabase.from('challenges').select('*').eq('login', login).single();
    if (fetchErr || !challenge) {
        return console.error('Account not found or error:', fetchErr?.message);
    }

    console.log(`Current Status: ${challenge.status}`);

    const { error: updateErr } = await supabase.from('challenges').update({ status: 'passed' }).eq('login', login);

    if (updateErr) {
        console.error("Update failed:", updateErr.message);
    } else {
        console.log(`✅ Success! Account ${login} status updated to 'passed'. Check the Pending Upgrades page.`);
    }
}

const loginId = parseInt(process.argv[2]);
if (loginId) {
    forcePass(loginId);
} else {
    console.log("Please provide a login id.");
}

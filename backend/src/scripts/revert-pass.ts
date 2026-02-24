import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function revertPass(login: number) {
    console.log(`Reverting pass for account: ${login}`);

    const { data: challenge, error: fetchErr } = await supabase.from('challenges').select('*').eq('login', login).single();
    if (fetchErr || !challenge) {
        return console.error('Account not found or error:', fetchErr?.message);
    }

    console.log(`Current Status: ${challenge.status}`);

    const { error: updateErr } = await supabase.from('challenges').update({ status: 'active' }).eq('login', login);

    if (updateErr) {
        console.error("Update failed:", updateErr.message);
    } else {
        console.log(`✅ Success! Account ${login} status reverted to 'active'.`);
    }
}

const loginId = parseInt(process.argv[2]);
if (loginId) {
    revertPass(loginId);
} else {
    console.log("Please provide a login id.");
}

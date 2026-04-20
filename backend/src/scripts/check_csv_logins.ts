import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkLogins() {
    const testLogins = ['620841', '631142', '900909603742']; // Logins from the 3rd column
    console.log(`🔍 Searching for test logins from Ocean Markets column: ${testLogins.join(', ')}`);

    for (const login of testLogins) {
        const { data: challenge, error } = await supabase
            .from('challenges')
            .select('id, login, group')
            .or(`login.eq.${login},login.eq.${Number(login)}`)
            .maybeSingle();

        if (error) {
            console.error(`❌ Error searching for ${login}:`, error.message);
        } else if (challenge) {
            console.log(`✅ Found: ${challenge.login} (ID: ${challenge.id}, Group: ${challenge.group})`);
        } else {
            console.log(`❌ Not found: ${login}`);
        }
    }
}

checkLogins();

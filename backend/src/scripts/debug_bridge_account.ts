
import { supabase } from '../lib/supabase';

async function main() {
    // Check multiple logins from the logs
    const logins = [889224633, 889224143, 889224464, 889224325, 889224363];

    console.log(`Checking ${logins.length} accounts in CRM...`);

    for (const login of logins) {
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('login', login)
            .single();

        if (error) {
            console.log(`[${login}] ❌ Error/Not Found:`, error.message);
        } else {
            console.log(`[${login}] ✅ Found: Status=${data.status}, Group=${data.group}`);
        }
    }
}

main().catch(console.error);

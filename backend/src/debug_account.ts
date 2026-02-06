import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const accountId = process.argv[2] || 'ef31c779-27cb-4ffb-83e1-1ccb77a1b5ee';

async function debug() {
    console.log(`Checking account ${accountId}...`);
    const { data: account, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', accountId)
        .single();

    if (error) {
        console.error('Error fetching account:', error);
        return;
    }

    if (account) {
        console.log('Account Details:', JSON.stringify(account, null, 2));
    } else {
        console.log('Account not found.');
    }
}

debug();

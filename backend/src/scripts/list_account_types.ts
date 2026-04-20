import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAccountTypes() {
    console.log('--- Listing Account Types (Raw) ---');
    try {
        const { data: accounts, error } = await supabase
            .from('account_types')
            .select('*');

        if (error) {
            console.error('Error fetching account_types:', error);
            return;
        }

        console.log(JSON.stringify(accounts, null, 2));
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

listAccountTypes();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reactivateAccount(login: string) {
    console.log(`Reactivating account: ${login}`);

    const { data: account, error: fetchError } = await supabase
        .from('challenges')
        .select('id, status')
        .eq('login', login)
        .single();

    if (fetchError || !account) {
        console.error('❌ Account not found');
        return;
    }

    const { error: updateError } = await supabase
        .from('challenges')
        .update({
            status: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

    if (updateError) {
        console.error('❌ Failed to reactivate account:', updateError.message);
    } else {
        console.log('✅ Account status set to ACTIVE');
    }
}

reactivateAccount('900909492845');

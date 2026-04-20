
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function compareData() {
    const oldId = 'bb0c3755-5dd6-4086-86fd-53fbb50164af'; // sharmarakhisharm895@gmail.com
    const newId = 'aac86649-ec00-4dbc-b4e7-550cc975c9d4'; // sharmarakhisharma895@gmail.com

    console.log(`--- Comparing Data ---`);

    const tables = ['orders', 'challenges', 'wallet_addresses', 'payout_requests'];
    
    for (const table of tables) {
        const { count: oldCount } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', oldId);
        const { count: newCount } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', newId);
        console.log(`Table ${table}: Old Email has ${oldCount}, New Email has ${newCount}`);
    }

    // Check last login or creation if available in profiles
    const { data: profiles } = await supabase.from('profiles').select('id, email, created_at, full_name').in('id', [oldId, newId]);
    console.log('Profiles:', profiles);
}

compareData();

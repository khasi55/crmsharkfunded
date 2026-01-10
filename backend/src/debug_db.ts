import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('Listing recent challenges with passwords...');
    const { data: challenges, error } = await supabase.from('challenges').select('id, user_id, login, master_password').limit(20);

    if (error) {
        console.error('Error fetching challenges:', error);
        return;
    }

    if (challenges && challenges.length > 0) {
        console.table(challenges);
        // Check if any starts with 77d664b5
        const target = challenges.find(c => c.id.startsWith('77d664b5'));
        if (target) {
            console.log('Target Challenge Found:', target);
            // Count trades
            const { count } = await supabase.from('trades').select('*', { count: 'exact', head: true }).eq('challenge_id', target.id);
            console.log(`Trades count for ${target.id}: ${count}`);
        }
    } else {
        console.log('No challenges found.');
    }
}

debug();


import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function verifyFK() {
    console.log('--- Verifying Foreign Key Join ---');

    // Attempt a join query
    const { data, error } = await supabase
        .from('challenges')
        .select('id, user_id, profiles(email, full_name)')
        .limit(5);

    if (error) {
        console.error('Join query failed:', error);
        console.log('Hypothesis: Foreign Key probably missing or RLS issue.');
    } else {
        console.log('Join query SUCCESS!');
        console.log('Sample data:', JSON.stringify(data, null, 2));
    }
}

verifyFK().catch(console.error);

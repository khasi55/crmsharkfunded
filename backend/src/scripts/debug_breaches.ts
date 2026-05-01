import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Fetching a sample breached challenge...');
    
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'breached')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching challenges:', error.message);
        return;
    }

    if (challenges.length > 0) {
        console.log('Sample breached challenge:');
        console.log(JSON.stringify(challenges[0], null, 2));
    } else {
        console.log('No breached challenges found.');
    }
}

main().catch(console.error);

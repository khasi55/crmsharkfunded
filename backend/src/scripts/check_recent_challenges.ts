
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log(`Checking ALL challenges created recently...`);

    // Check last 20 minutes
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .gte('created_at', twentyMinsAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching challenges:', error.message);
        return;
    }

    if (!challenges || challenges.length === 0) {
        console.log('No recent challenges found in DB.');
        return;
    }

    console.log(`Found ${challenges.length} recent challenges.`);
    challenges.forEach((c, i) => {
        console.log(`Challenge ${i + 1}:`);
        console.log(`- ID: ${c.id}`);
        console.log(`- User ID: ${c.user_id}`);
        console.log(`- Login: ${c.login}`);
        console.log(`- Type: ${c.challenge_type}`);
        console.log(`- Created At: ${c.created_at}`);
    });
}

check();

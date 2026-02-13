import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function run() {
    console.log('--- START AUDIT ---');
    const { data: challenges, error } = await supabase.from('challenges').select('user_id, login');
    if (error) {
        console.error('Fetch challenges error:', JSON.stringify(error));
        return;
    }
    if (!challenges || challenges.length === 0) {
        console.log('No challenges found in DB.');
        return;
    }
    console.log('Found ' + challenges.length + ' challenges.');
    const uniqueIds = [...new Set(challenges.map(c => c.user_id))];
    console.log('Unique owner IDs count:', uniqueIds.length);

    for (const uid of uniqueIds) {
        try {
            const { data: userRecord } = await supabase.auth.admin.getUserById(uid);
            const { count } = await supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('user_id', uid);
            console.log(`ID: ${uid} | Email: ${userRecord?.user?.email || 'NOT FOUND'} | Challenges: ${count}`);
        } catch (e) {
            console.log(`ID: ${uid} | Error fetching user`);
        }
    }
    console.log('--- END AUDIT ---');
}
run();

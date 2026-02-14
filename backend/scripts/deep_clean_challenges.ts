
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_EMAILS = ['khasireddy3@gmail.com', 'siddareddy1947@gmail.com'];
const TARGET_PARTIAL_IDS = ['9504eabc', 'd7a9e0b8', 'e1010116'];

async function main() {
    console.log('🔍 Searching for lingering challenges...');

    // 1. Get User IDs
    const { data: users } = await supabase.from('profiles').select('id, email').in('email', TARGET_EMAILS);

    if (!users || users.length === 0) {
        console.log('No profiles found for these emails.');
        return;
    }

    const userIds = users.map(u => u.id);
    console.log(`Found ${users.length} users:`, users.map(u => u.email));

    // 2. Fetch ALL challenges for these users
    const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .in('user_id', userIds);

    console.log(`Found ${challenges?.length || 0} total challenges for these users.`);

    // 3. Filter for the ones matching the partial IDs OR simply list them to see what's left
    const toDelete: string[] = [];

    challenges?.forEach(c => {
        const idStart = c.id.split('-')[0];
        console.log(`- Challenge: ${c.id} | Status: ${c.status} | User: ${users.find(u => u.id === c.user_id)?.email}`);

        if (TARGET_PARTIAL_IDS.includes(idStart)) {
            console.log(`  >>> MATCHES TARGET! Marking for deletion.`);
            toDelete.push(c.id);
        }
    });

    if (toDelete.length > 0) {
        console.log(`\n🗑️ Deleting ${toDelete.length} matched challenges...`);
        const { error } = await supabase.from('challenges').delete().in('id', toDelete);
        if (error) console.error('Delete failed:', error);
        else console.log('✅ Delete successful.');
    } else {
        console.log('\n✅ No matching challenges found to delete.');
    }
}

main().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkChallenges() {
    const ids = ['ea290566-c2ce-47ca-8cfa-851d30d3df38', '6f9f4a8a-75c6-40ab-a1dd-2870d81ea43a'];
    
    for (const id of ids) {
        console.log(`Checking challenges for user ID: ${id}`);
        const { data, error } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', id);
        
        if (error) console.error(`Error for ${id}:`, error.message);
        else {
            console.log(`User ${id} has ${data.length} challenges.`);
            data.forEach(c => console.log(`  Challenge ID: ${c.id}, Email used: ${c.email}`));
        }
    }
}

checkChallenges();

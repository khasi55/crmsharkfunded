import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAuthDetails() {
    const ids = ['ea290566-c2ce-47ca-8cfa-851d30d3df38', '6f9f4a8a-75c6-40ab-a1dd-2870d81ea43a'];
    
    for (const id of ids) {
        console.log(`Checking Auth for ID: ${id}`);
        const { data: { user }, error } = await supabase.auth.admin.getUserById(id);
        if (error) console.error(`Error for ${id}:`, error.message);
        else if (user) {
            console.log(`Auth User ${id}: Email=${user.email}, CreatedAt=${user.created_at}`);
        } else {
            console.log(`Auth User ${id} not found.`);
        }
    }
}

checkAuthDetails();

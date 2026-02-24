import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function search() {
    console.log("Searching in auth users for 'shashank'...");
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listed users:", error);
        return;
    }

    const matches = users.users.filter(u => u.email?.toLowerCase().includes('shashank'));
    console.log(matches.map(u => u.email));
}

search();

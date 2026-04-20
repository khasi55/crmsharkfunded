import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Checking profile for susmitamandal886@gmail.com...');
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'susmitamandal886@gmail.com')
        .single();

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Profile:", JSON.stringify(profile, null, 2));
    }
}
check();

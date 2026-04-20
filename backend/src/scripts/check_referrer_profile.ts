import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    console.log('Checking referrer profile for e8b668be-20a8-4f1c-898f-7b6c658d88ab...');
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'e8b668be-20a8-4f1c-898f-7b6c658d88ab')
        .single();

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Referrer Profile:", JSON.stringify(profile, null, 2));
    }
}
check();

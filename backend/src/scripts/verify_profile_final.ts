
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function run() {
    const email = process.argv[2];
    if (!email) {
        console.error('Provide email');
        process.exit(1);
    }
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

    if (error) {
        console.error('Error:', error);
    } else if (profile) {
        console.log('✅ Profile found with metadata:', JSON.stringify(profile.metadata, null, 2));
    } else {
        console.log('❌ Profile NOT found');
    }
}

run();

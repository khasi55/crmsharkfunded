
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const { data: d2, error: e2 } = await supabase.from('challenges').select('*').limit(1);

    if (e2) {
        console.error('challenges error:', e2.message);
    } else {
        console.log('challenges columns:', d2 && d2.length > 0 ? Object.keys(d2[0]) : 'no data');
    }
}

check();

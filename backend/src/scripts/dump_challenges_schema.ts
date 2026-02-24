import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function dumpColumns() {
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- CHALLENGES COLUMNS ---');
    console.log(Object.keys(data).join(', '));
    console.log('--- SAMPLE ROW ---');
    console.log(JSON.stringify(data, null, 2));
}

dumpColumns();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey) as any;

const COMPETITION_ID = '15579444-b28d-420d-aa40-c892b4551dd2';

async function checkRules() {
    console.log(`Checking details for competition ${COMPETITION_ID}...`);

    const { data: comp, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', COMPETITION_ID)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- Competition Data ---');
    console.log(JSON.stringify(comp, null, 2));
}

checkRules();

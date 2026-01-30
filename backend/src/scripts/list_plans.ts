import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey) as any;

async function checkPlans() {
    console.log("Fetching plans...");
    const { data: plans, error } = await supabase.from('plans').select('*');
    if (error) console.error(error);
    else console.table(plans);
}

checkPlans();

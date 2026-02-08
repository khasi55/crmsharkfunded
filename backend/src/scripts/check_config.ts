
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkConfig() {
    const { data, error } = await supabase
        .from('risk_rules_config')
        .select('*');

    if (error) {
        console.error("Error fetching config:", error);
    } else {
        console.log("Risk Config:");
        console.table(data);
    }
}

checkConfig();

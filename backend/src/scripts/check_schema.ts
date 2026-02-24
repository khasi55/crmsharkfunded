import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
    const { data: p } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles Sample:", p ? Object.keys(p[0]) : "No data");

    const { data: b } = await supabase.from('bank_details').select('*').limit(1);
    console.log("Bank Details Sample:", b ? Object.keys(b[0]) : "No data");
}
checkSchema();

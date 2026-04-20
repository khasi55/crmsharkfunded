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

    const { data: ae } = await supabase.from('affiliate_earnings').select('*').limit(1);
    console.log("Affiliate Earnings Sample:", ae ? Object.keys(ae[0]) : "No data");

    const { data: pr } = await supabase.from('payout_requests').select('*').limit(1);
    console.log("Payout Requests Sample:", pr ? Object.keys(pr[0]) : "No data");
}
checkSchema();

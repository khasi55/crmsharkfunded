
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkCompStatus() {
    const COMP_ID = 'e9e0d221-4925-4437-9572-90ea8bc22c2c';
    console.log(`Checking Competition ${COMP_ID}...`);

    const { data: comp, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', COMP_ID)
        .single();

    if (error) { console.error(error); return; }

    console.log(`Title: ${comp.title}`);
    console.log(`Status: ${comp.status}`);
    console.log(`Start Date: ${comp.start_date}`);
    console.log(`End Date:   ${comp.end_date}`);
    console.log(`Current Time (ISO): ${new Date().toISOString()}`);

    if (comp.status !== 'active') {
        const now = new Date();
        const start = new Date(comp.start_date);
        const end = new Date(comp.end_date);

        if (now < start) console.log("⚠️ Competition is UPCOMING (Start date in future)");
        else if (now > end) console.log("⚠️ Competition is ENDED (End date passed)");
        else console.log("⚠️ Competition SHOULD be active but isn't (Scheduler issue?)");
    } else {
        console.log("✅ Competition is ACTIVE");
    }
}

checkCompStatus();

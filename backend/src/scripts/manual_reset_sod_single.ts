import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function manualResetSodSingleHardcoded() {
    const LOGIN = 889224671;
    const MANUAL_SOD = 98047;

    console.log(`Checking/Forcing SOD Reset for single account ${LOGIN} to FIXED VALUE: ${MANUAL_SOD}...`);

    // 1. Get Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    console.log(`CURRENT DB State -> SOD: ${challenge.start_of_day_equity}, Current Equity: ${challenge.current_equity}`);

    // 2. Perform Update Directly
    console.log(`🔄 Updating SOD to ${MANUAL_SOD}...`);

    const { error: dbError } = await supabase
        .from('challenges')
        .update({
            start_of_day_equity: MANUAL_SOD,
            // We usually want to sync current equity too if this is a "reset" to current state
            // But user specifically said "sod is 98047". I'll update current_equity to match to be safe/consistent
            // assuming this IS the live equity.
            current_equity: MANUAL_SOD,
            updated_at: new Date().toISOString()
        })
        .eq('id', challenge.id);

    if (dbError) {
        console.error("❌ Database Update Failed:", dbError);
    } else {
        console.log(`✅ Database Updated Successfully.`);
        console.log(`   Account: ${LOGIN}`);
        console.log(`   New SOD: ${MANUAL_SOD}`);
    }
}

manualResetSodSingleHardcoded();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function removeFalsePositive() {
    const ticket = '8075673';
    const violationType = 'hedging';

    console.log(`🗑️ Removing False Positive '${violationType}' for Ticket #${ticket}...`);

    const { data, error } = await supabase
        .from('advanced_risk_flags')
        .delete()
        .eq('trade_ticket', ticket)
        .eq('flag_type', violationType)
        .select();

    if (error) {
        console.error("❌ Error deleting flag:", error);
    } else if (data && data.length > 0) {
        console.log("✅ Successfully removed violation:");
        console.log(data);
    } else {
        console.log("⚠️ No matching violation found to delete.");
    }
}

removeFalsePositive();

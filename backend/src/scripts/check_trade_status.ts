
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkTrade() {
    const ticket = '8074295';
    console.log(`Checking status for Trade Ticket: ${ticket}`);

    // 1. Check Trade Table
    const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('ticket', ticket)
        .maybeSingle();

    if (tradeError) console.error("Error fetching trade:", tradeError);
    if (!trade) {
        console.log("❌ Trade NOT found in 'trades' table.");
    } else {
        console.log("✅ Trade FOUND in 'trades' table.");
        console.log(`   - ID: ${trade.id}`);
        console.log(`   - Close Time: ${trade.close_time}`);
    }

    // 2. Check Risk Flags
    const { data: flags, error: flagError } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('trade_ticket', ticket);

    if (flagError) console.error("Error fetching flags:", flagError);
    if (!flags || flags.length === 0) {
        console.log("❌ No Risk Flags found for this ticket.");
    } else {
        console.log(`✅ FOUND ${flags.length} Risk Flags for this ticket:`);
        console.table(flags.map(f => ({
            id: f.id,
            type: f.flag_type,
            created_at: f.created_at,
            desc: f.description
        })));
    }
}

checkTrade();

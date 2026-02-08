
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function showDetails() {
    const ticket = '8074295';
    console.log(`\n🔍 Analyzing Violation Source for Ticket: ${ticket}\n`);

    // 1. Get the Trade Details
    const { data: trade } = await supabase
        .from('trades')
        .select('*')
        .eq('ticket', ticket)
        .single();

    if (trade) {
        console.log("---------------------------------------------------");
        console.log(`📉 CAUSAL TRADE: #${trade.ticket}`);
        console.log("---------------------------------------------------");
        console.log(`Symbol:    ${trade.symbol}`);
        console.log(`Type:      ${trade.type === 0 ? 'Buy' : 'Sell'}`);
        console.log(`Open:      ${trade.open_time}`);
        console.log(`Close:     ${trade.close_time}`);
        const duration = (new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime()) / 1000;
        console.log(`Duration:  ${duration} seconds`);
        console.log("---------------------------------------------------\n");
    }

    // 2. Get the Risk Flags linked to this Ticket
    const { data: flags } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('trade_ticket', ticket);

    if (flags && flags.length > 0) {
        console.log(`🚩 VIOLATIONS TRIGGERED BY THIS TRADE (${flags.length}):`);
        flags.forEach(f => {
            console.log(`\n   [${f.flag_type.toUpperCase()}]`);
            console.log(`   Description: "${f.description}"`);
            console.log(`   Logged At:   ${f.created_at}`);
        });
    } else {
        console.log("✅ No violations found linked to this trade ticket.");
    }
}

showDetails();

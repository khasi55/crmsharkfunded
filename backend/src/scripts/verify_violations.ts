import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyViolations() {
    console.log('🔍 Verifying violations have trade_id populated...\n');

    // Get a violation
    const { data: violations } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('flag_type', 'martingale')
        .limit(3);

    console.log(`Found ${violations?.length} martingale violations\n`);

    for (const v of violations || []) {
        console.log(`Violation ID: ${v.id}`);
        console.log(`  Trade ID: ${v.trade_id || 'NULL - PROBLEM!'}`);
        console.log(`  Trade Ticket: ${v.trade_ticket || 'NULL'}`);
        console.log(`  Description: ${v.description}`);

        if (v.trade_id) {
            // Try to fetch the trade
            const { data: trade } = await supabase
                .from('trades')
                .select('*')
                .eq('id', v.trade_id)
                .single();

            if (trade) {
                console.log(`  ✅ Trade found! Lots: ${trade.lots}, Symbol: ${trade.symbol}`);
            } else {
                console.log(`  ❌ Trade NOT found for ID: ${v.trade_id}`);
            }
        }
        console.log();
    }
}

verifyViolations().catch(console.error);

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

async function checkTrades() {
    // Get challenge ID for account 900909490084
    const { data: challenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('login', '900909490084')
        .single();

    if (!challenge) {
        console.log('❌ Challenge not found');
        return;
    }

    console.log(`✅ Found challenge ID: ${challenge.id}\n`);

    // Get trades for this challenge
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('open_time', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error fetching trades:', error);
        return;
    }

    console.log(`📊 Found ${trades?.length} trades\n`);
    console.log('Sample trades:');
    console.log('='.repeat(80));

    trades?.forEach((trade, idx) => {
        console.log(`\nTrade ${idx + 1}:`);
        console.log(`  ID: ${trade.id}`);
        console.log(`  Ticket Number: ${trade.ticket_number || 'NULL/MISSING'}`);
        console.log(`  Symbol: ${trade.symbol}`);
        console.log(`  Type: ${trade.type}`);
        console.log(`  Lots: ${trade.lots}`);
        console.log(`  Open Price: ${trade.open_price}`);
        console.log(`  Close Price: ${trade.close_price || 'Open'}`);
        console.log(`  P/L: ${trade.profit_loss}`);
        console.log(`  Open Time: ${trade.open_time}`);
    });
}

checkTrades().catch(console.error);

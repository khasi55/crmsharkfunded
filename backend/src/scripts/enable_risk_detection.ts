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

async function enableRiskDetection() {
    console.log('🔧 Enabling Risk Detection Rules...\n');

    // 1. Check current configuration
    console.log('📊 Current Configuration:');
    const { data: currentConfig, error: fetchError } = await supabase
        .from('risk_rules_config')
        .select('mt5_group_name, min_trade_duration_seconds, allow_ea_trading, allow_news_trading')
        .limit(5);

    if (fetchError) {
        console.error('❌ Error fetching config:', fetchError);
        return;
    }

    console.table(currentConfig);

    // 2. Enable tick scalping detection (60 seconds minimum)
    console.log('\n🔄 Updating min_trade_duration_seconds to 60...');
    const { error: updateError } = await supabase
        .from('risk_rules_config')
        .update({ min_trade_duration_seconds: 60 })
        .or('min_trade_duration_seconds.eq.0,min_trade_duration_seconds.is.null');

    if (updateError) {
        console.error('❌ Error updating config:', updateError);
        return;
    }

    console.log('✅ Updated successfully!');

    // 3. Verify the update
    console.log('\n📊 Updated Configuration:');
    const { data: updatedConfig } = await supabase
        .from('risk_rules_config')
        .select('mt5_group_name, min_trade_duration_seconds, allow_ea_trading, allow_news_trading')
        .limit(5);

    console.table(updatedConfig);

    console.log('\n✨ Risk Detection Rules Enabled!');
    console.log('📋 Active Rules:');
    console.log('  ✅ Martingale Detection: Always active');
    console.log('  ✅ Hedging Detection: Always active');
    console.log('  ✅ Tick Scalping: Minimum 60 seconds trade duration');
    console.log('  ✅ Latency Arbitrage: Always active');
    console.log('  ✅ Triangular Arbitrage: Always active');
}

enableRiskDetection().catch(console.error);

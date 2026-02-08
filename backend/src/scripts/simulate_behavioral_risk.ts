
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AdvancedRiskEngine } from '../engine/risk-engine-advanced';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function simulate() {
    console.log("🧬 Simulating Behavioral Risk Check...");

    // Use the challenge and ticket from previous finding
    const challengeId = '09ed7522-5738-46aa-9b07-4612043493ad';
    const ticket = 8075000; // 6s duration

    // 1. Fetch Trade
    const { data: trade } = await supabase.from('trades').select('*').eq('ticket', ticket).single();
    if (!trade) {
        console.error("Trade not found");
        return;
    }
    console.log(`Analyzing Trade: ${ticket} (Duration: ${(new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime()) / 1000}s)`);

    // 2. Fetch Rules (Exact logic from risk-event-worker.ts)
    const { data: challengeData } = await supabase
        .from('challenges')
        .select('id, group, user_id')
        .eq('id', challengeId)
        .single();

    if (!challengeData) { console.error("Challenge not found"); return; }
    console.log(`Challenge Group: '${challengeData.group}'`);

    let rulesConfig;
    if (challengeData.group) {
        const { data: groupConfig } = await supabase
            .from('risk_rules_config')
            .select('*')
            .eq('mt5_group_name', challengeData.group)
            .maybeSingle();

        rulesConfig = groupConfig;
        if (rulesConfig) console.log("✅ Fetched Group Config:", rulesConfig.mt5_group_name);
        else console.log("⚠️ Group Config NOT found, falling back.");
    }

    if (!rulesConfig) {
        const { data: defaultConfig } = await supabase
            .from('risk_rules_config')
            .select('*')
            .limit(1)
            .maybeSingle();
        rulesConfig = defaultConfig;
        console.log("ℹ️ Fetched Default Config");
    }

    const rules = {
        allow_weekend_trading: rulesConfig?.allow_weekend_trading ?? true,
        allow_news_trading: rulesConfig?.allow_news_trading ?? true,
        allow_ea_trading: rulesConfig?.allow_ea_trading ?? true,
        min_trade_duration_seconds: rulesConfig?.min_trade_duration_seconds ?? 0,
        max_single_win_percent: rulesConfig?.max_single_win_percent ?? 50
    };

    console.log("Effective Min Duration:", rules.min_trade_duration_seconds);

    // 3. Initialize Engine
    const advancedEngine = new AdvancedRiskEngine(supabase);

    // 4. Run Check
    // Note: checkBehavioralRisk(trade, rules, todaysTrades, openTrades)
    // We need mock arrays for todaysTrades/openTrades if the function requires them, usually it just needs the trade for duration check.

    const violations = await advancedEngine.checkBehavioralRisk(
        trade,
        rules,
        [], // todaysTrades - irrelevant for scalping
        []  // openTrades - irrelevant for scalping
    );

    console.log("\n--- Simulation Results ---");
    if (violations.length > 0) {
        console.log("✅ VIOLATION DETECTED:", violations);
    } else {
        console.log("❌ NO VIOLATION DETECTED - Logic Flaw?");
    }
}

simulate();

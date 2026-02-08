
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkRules() {
    const challengeId = '09ed7522-5738-46aa-9b07-4612043493ad'; // From previous list
    console.log(`🔍 Checking Rules for Challenge: ${challengeId}`);

    // 1. Get Challenge Group
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('id, login, group, challenge_type')
        .eq('id', challengeId)
        .single();

    if (cError) {
        console.error("Error fetching challenge:", cError);
        return;
    }
    console.log("Challenge Data:", challenge);

    // 2. Fetch Config for Group
    // Logic from risk-event-worker.ts (simulated)
    let config;
    if (challenge.group) {
        const { data: groupConfig } = await supabase
            .from('risk_rules_config')
            .select('*')
            .eq('mt5_group_name', challenge.group)
            .maybeSingle();

        if (groupConfig) {
            console.log(`✅ Found Specific Rule for Group '${challenge.group}':`, groupConfig);
            config = groupConfig;
        } else {
            console.log(`⚠️ No Specific Rule for Group '${challenge.group}'`);
        }
    }

    if (!config) {
        const { data: defaultConfig } = await supabase
            .from('risk_rules_config')
            .select('*')
            .limit(1)
            .maybeSingle();
        console.log("ℹ️ Using Default Config:", defaultConfig);
        config = defaultConfig;
    }

    console.log("\n--- Effective Risk Rules ---");
    console.log(`Min Trade Duration: ${config?.min_trade_duration_seconds} seconds`);
    console.log(`Allow Weekend: ${config?.allow_weekend_trading}`);
    console.log(`Allow News: ${config?.allow_news_trading}`);
}

checkRules();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugRiskGroups() {
    console.log("🔍 Debugging Risk Group Matching...");

    const LOGIN = 889224326;

    // 1. Fetch Challenge
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (!challenge) {
        console.error("❌ Challenge not found");
        return;
    }

    console.log(`👤 Account: ${challenge.login}`);
    console.log(`🏷️  DB Group String: "${challenge.group}"`);

    // Normalize Challenge Group
    // Logic from risk-scheduler.ts:
    const normalizedChallengeGroup = (challenge.group || '').replace(/\\\\/g, '\\').toLowerCase();
    console.log(`🔧 Normalized Challenge Group: "${normalizedChallengeGroup}"`);

    // 2. Fetch Risk Groups
    const { data: riskGroups } = await supabase
        .from('mt5_risk_groups')
        .select('*');

    console.log(`📚 Loaded ${riskGroups?.length} Risk Groups from DB.`);

    // 3. Match Logic
    const riskGroupMap = new Map((riskGroups || []).map(g => [g.group_name.replace(/\\\\/g, '\\').toLowerCase(), g]));

    let rule = riskGroupMap.get(normalizedChallengeGroup);
    let matchMethod = "Direct Map Get";

    if (!rule) {
        matchMethod = "Literal Find";
        // Try literal match
        rule = (riskGroups || []).find(g => g.group_name === challenge.group);
    }

    if (!rule) {
        matchMethod = "NONE (Default Fallback)";
        rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 }; // Default
    }

    console.log("---------------------------------------------------");
    console.log(`🎯 Match Result: ${matchMethod}`);
    console.log(`📜 Applied Rule Name: ${rule.group_name || 'DEFAULT'}`);
    console.log(`📉 Daily Drawdown %: ${rule.daily_drawdown_percent}%`);
    console.log("---------------------------------------------------");

    // Recalculate based on findings
    const initialBalance = Number(challenge.initial_balance);
    const startOfDayEquity = Number(challenge.start_of_day_equity || initialBalance);

    // Correct Formula (Fixed Amount)
    const dailyLimit = startOfDayEquity - (initialBalance * (Number(rule.daily_drawdown_percent) / 100));

    console.log(`🧮 Calculated Daily Limit: $${dailyLimit}`);
    console.log(`💵 Current Equity: $${challenge.current_equity}`);

    if (challenge.current_equity < dailyLimit) {
        console.log("✅ RESULT: BREACH DETECTED with this rule.");
    } else {
        console.error("❌ RESULT: NO BREACH detected (Rule might be too loose!)");
    }
}

debugRiskGroups();

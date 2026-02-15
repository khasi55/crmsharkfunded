
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RulesService } from '../services/rules-service';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const login = 900909492949;

    // 1. Fetch Challenge Details
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.error('Challenge not found');
        return;
    }

    console.log('\n--- Challenge Details ---');
    console.log('ID:', challenge.id);
    console.log('Initial Balance:', challenge.initial_balance);
    console.log('Current Equity:', challenge.current_equity);
    console.log('Start of Day Equity:', challenge.start_of_day_equity);
    console.log('Group:', challenge.group);

    // 2. Fetch Risk Rules to Calculate Limits
    console.log('\n--- Limit Calculation ---');

    // Manual Calculation logic mirroring risk-scheduler.ts
    const { data: riskGroups } = await supabase.from('mt5_risk_groups').select('*');
    const riskGroupMap = new Map(riskGroups?.map(g => [g.group_name.replace(/\\\\/g, '\\').toLowerCase(), g]) || []);

    let rule = riskGroupMap.get((challenge.group || '').replace(/\\\\/g, '\\').toLowerCase());
    if (!rule) rule = riskGroups?.find(g => g.group_name === challenge.group);
    if (!rule) {
        rule = { max_drawdown_percent: 10, daily_drawdown_percent: 5 }; // Fallback
        console.log('Using Fallback Rules');
    } else {
        console.log('Using Group Rules:', rule.mt5_group_name);
    }

    const initialBalance = Number(challenge.initial_balance);
    const startOfDayEquity = Number(challenge.start_of_day_equity || initialBalance);

    const totalLimit = initialBalance * (1 - (rule.max_drawdown_percent / 100));
    const dailyLimit = startOfDayEquity - (initialBalance * (rule.daily_drawdown_percent / 100));
    const effectiveLimit = Math.max(totalLimit, dailyLimit);

    console.log('Max Drawdown %:', rule.max_drawdown_percent);
    console.log('Daily Drawdown %:', rule.daily_drawdown_percent);
    console.log('Total Limit:', totalLimit);
    console.log('Daily Limit:', dailyLimit);
    console.log('Effective Limit (Stricter):', effectiveLimit);

    console.log('---------------------------');
    if (Number(challenge.current_equity) < effectiveLimit) {
        console.log(`🚨 BREACH CONFIRMED: Equity ${challenge.current_equity} < Limit ${effectiveLimit}`);
        console.log(`Reason: ${effectiveLimit === totalLimit ? 'Max Drawdown' : 'Daily Drawdown'}`);
    } else {
        console.log(`✅ NO MAX LOSS BREACH: Equity ${challenge.current_equity} >= Limit ${effectiveLimit}`);
    }

    // 3. Check for Triggers
    console.log('\n--- DB Triggers Check ---');
    // Note: We can't query information_schema easily via Supabase JS client without rpc or raw query if permissions allow.
    // We'll try to use a raw query if postgres function exists, otherwise relying on manual inspection or psql if available.
    // For now, let's just inspect if there are any suspicious columns in advanced_risk_flags

}

main();

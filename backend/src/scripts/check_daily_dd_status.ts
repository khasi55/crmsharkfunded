import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDailyDd() {
    const LOGIN = 889224671;

    // 1. Get Challenge
    const { data: c, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (error || !c) {
        console.error('Error fetching challenge:', error);
        return;
    }

    console.log(`\n📊 Daily Drawdown Status for ${LOGIN}`);
    console.log(`----------------------------------------`);

    const initialBalance = Number(c.initial_balance);
    const startOfDayEquity = Number(c.start_of_day_equity);
    const currentEquity = Number(c.current_equity);

    // Assuming 5% Daily Drawdown (Standard) for calculation needed, fetching group logic is complex, 
    // assuming standard 5% for display or 4% as user mentioned "accorifn to this 4% daily dd"
    const dailyDdPercent = 4; // User specified 4% in prompt

    // Limit Calculation:
    // Daily Limit = StartOfDay - (InitialBalance * Percent)
    const maxDailyLossAmount = initialBalance * (dailyDdPercent / 100);
    const equityLimit = startOfDayEquity - maxDailyLossAmount;

    const currentDailyLoss = startOfDayEquity - currentEquity;
    const currentDailyLossPercent = (currentDailyLoss / initialBalance) * 100;

    const remainingBuffer = currentEquity - equityLimit;

    console.log(`💰 Initial Balance:      $${initialBalance.toLocaleString()}`);
    console.log(`🌅 Start of Day Equity:  $${startOfDayEquity.toLocaleString()}`);
    console.log(`📉 Current Equity:       $${currentEquity.toLocaleString()}`);
    console.log(`----------------------------------------`);
    console.log(`rules: Daily DD Limit: ${dailyDdPercent}% ($${maxDailyLossAmount.toLocaleString()})`);
    console.log(`🛑 Equity Breach Level:  $${equityLimit.toLocaleString()}`);
    console.log(`----------------------------------------`);

    if (currentDailyLoss > 0) {
        console.log(`⚠️  Current Daily Loss:   $${currentDailyLoss.toLocaleString()} (${currentDailyLossPercent.toFixed(2)}%)`);
    } else {
        console.log(`✅ Current Daily Profit: $${Math.abs(currentDailyLoss).toLocaleString()}`);
    }

    if (remainingBuffer < 0) {
        console.log(`❌ STATUS: BREACHED by $${Math.abs(remainingBuffer).toLocaleString()}`);
    } else {
        console.log(`✅ STATUS: SAFE. Remaining Buffer: $${remainingBuffer.toLocaleString()}`);
    }
    console.log(`----------------------------------------`);
}

checkDailyDd();

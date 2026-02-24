import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function simulateBulk() {
    const targetId = '08308eb1-dea2-40ae-9d10-5f75cccb06b4';

    // 1. Fetch Challenge (Simulating challengeResponse)
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', targetId)
        .single();

    if (challengeError || !challenge) {
        console.error('Challenge not found');
        return;
    }

    // 2. Mocking RulesService.calculateObjectives (since I can't easily import it here without complex setup)
    // I'll re-implement the logic:
    const initialBalance = Number(challenge.initial_balance);
    const currentEquity = Number(challenge.current_equity);
    const startOfDayEquity = Number(challenge.start_of_day_equity ?? initialBalance);

    // Hardcoded 3% for this specific account as seen in screenshot
    const maxDailyLossPercent = 3;
    const maxDailyLoss = initialBalance * (maxDailyLossPercent / 100);

    const dailyNet = currentEquity - startOfDayEquity;
    const dailyLoss = dailyNet >= 0 ? 0 : Math.abs(dailyNet);
    const dailyBreachLevel = startOfDayEquity - maxDailyLoss;
    const dailyRemaining = Math.max(0, currentEquity - dailyBreachLevel);

    console.log(`\n📊 SIMULATED BACKEND RESPONSE for ${targetId}`);
    console.log(`----------------------------------------`);
    console.log(`Initial Balance:      $${initialBalance}`);
    console.log(`Current Equity:       $${currentEquity}`);
    console.log(`Start of Day Equity:  $${startOfDayEquity}`);
    console.log(`Daily Net:            $${dailyNet}`);
    console.log(`Daily Loss (Current): $${dailyLoss}`);
    console.log(`Daily Breach Level:   $${dailyBreachLevel}`);
    console.log(`Daily Remaining:      $${dailyRemaining}`);
    console.log(`----------------------------------------`);
}

simulateBulk();

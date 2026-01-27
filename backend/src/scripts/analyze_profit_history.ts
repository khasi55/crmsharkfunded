
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const login = 889225368;
    console.log(`Analyzing profit history for: ${login}`);

    // 1. Get Challenge to confirm initial balance
    const { data: challenge } = await supabase
        .from('challenges')
        .select('initial_balance, start_of_day_equity, id')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.error("Challenge not found");
        return;
    }

    console.log(`Initial Balance: ${challenge.initial_balance}`);
    console.log(`Current SOD: ${challenge.start_of_day_equity}`);
    console.log(`Profit target ~ $32,895 (Total ~132,895)`);

    // 2. Fetch Trades
    const { data: trades } = await supabase
        .from('trades')
        .select('ticket, close_time, profit_loss, commission, swap, type')
        .eq('challenge_id', challenge.id)
        .order('close_time', { ascending: true });

    if (!trades || trades.length === 0) {
        console.log("No trades found.");
        return;
    }

    console.log(`Found ${trades.length} trades.`);

    let runningBalance = challenge.initial_balance;
    let maxBalance = 0;
    let profit32kDate: string | null = null;

    // Group by day to show daily P/L
    const dailyStats: Record<string, number> = {};

    trades.forEach(t => {
        const netPL = (t.profit_loss || 0) + (t.commission || 0) + (t.swap || 0);
        runningBalance += netPL;

        const date = t.close_time.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = 0;
        dailyStats[date] += netPL;

        // Check if we hit the ~32k profit region (approx 132,895)
        // We look for when it crossed 132,000 for the first time or settled around there
        if (runningBalance >= 132800 && !profit32kDate) {
            console.log(`\n HIT TARGET! Balance crossed 132,800 on ticket ${t.ticket} at ${t.close_time}`);
            console.log(`Running Balance: ${runningBalance}`);
            profit32kDate = t.close_time;
        }
    });

    // Debug: Print all raw dates and types
    console.log("Raw Trade Data Sample:");
    trades.forEach((t, i) => {
        if (i < 5 || t.close_time.includes('2026-01')) {
            console.log(`${i}: Ticket ${t.ticket} | Time: ${t.close_time} | P/L: ${t.profit_loss} | Type: ${t.type}`);
        }
    });

    console.log("\nDaily P/L Summary:");
    let cumulative = challenge.initial_balance;
    Object.keys(dailyStats).sort().forEach(date => {
        cumulative += dailyStats[date];
        console.log(`[${date}] P/L: ${dailyStats[date].toFixed(2).padStart(10)} | End Balance: ${cumulative.toFixed(2)}`);
    });

}

main();

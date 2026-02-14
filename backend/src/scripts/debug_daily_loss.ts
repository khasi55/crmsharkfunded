
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading from frontend (relative to backend dir)
const envPath = path.resolve(process.cwd(), '../frontend/.env');
console.log(`Loading .env from: ${envPath}`);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error(".env file not found at " + envPath);
}

// Map Frontend keys to Backend keys if needed (or just use correct names)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Searching for challenge SF-d63586f7...");

    // Fetch recent 50 challenges and find the match
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching challenges:", error);
        return;
    }

    const targetPrefix = '916e9773'; // We'll ignore this for now to list all
    console.log(`Scanning recent challenges...`);

    // List top 5
    console.log("=== RECENT CHALLENGES ===");
    challenges.slice(0, 5).forEach((ch: any) => {
        console.log(`ID: ${ch.id} | Balance: ${ch.initial_balance} | Equity: ${ch.current_equity} | SOD: ${ch.start_of_day_equity}`);
    });
    console.log("=========================");

    const c = challenges.find((ch: any) => ch.id.startsWith(targetPrefix));

    if (!c) {
        console.log("No challenge found matching ID prefix " + targetPrefix);
        return;
    }
    console.log("\n=== CHALLENGE DATA ===");
    console.log(`ID: ${c.id}`);
    console.log(`Account No: ${c.challenge_number}`);
    console.log(`Initial Balance: ${c.initial_balance}`);
    console.log(`Current Equity: ${c.current_equity}`);
    console.log(`Current Balance: ${c.current_balance}`);
    console.log(`Start of Day Equity: ${c.start_of_day_equity}`);
    console.log(`Status: ${c.status}`);
    console.log("======================\n");

    // Check Risk Calculations manually
    const initialBalance = Number(c.initial_balance);
    const currentEquity = Number(c.current_equity);
    const sodEquity = Number(c.start_of_day_equity) || initialBalance;

    console.log(`Initial: ${initialBalance}`);
    console.log(`Equity: ${currentEquity} (${typeof c.current_equity})`);
    console.log(`SOD: ${sodEquity} (${typeof c.start_of_day_equity})`);

    const dailyNet = currentEquity - sodEquity;
    const dailyLoss = dailyNet < 0 ? Math.abs(dailyNet) : 0;

    const totalNet = currentEquity - initialBalance;
    const totalLoss = totalNet < 0 ? Math.abs(totalNet) : 0;

    console.log(`\nDaily Net: ${dailyNet}`);
    console.log(`Daily Loss: ${dailyLoss}`);
    console.log(`Total Net: ${totalNet}`);
    console.log(`Total Loss: ${totalLoss}`);
}

main();

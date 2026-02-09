
import { adjustMT5Balance } from '../lib/mt5-bridge';
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: npx tsx src/scripts/manual_withdraw.ts <login> <amount> [comment]");
        process.exit(1);
    }

    const login = Number(args[0]);
    const amount = -Math.abs(Number(args[1])); // Force negative
    const comment = args[2] || "Manual Admin Withdrawal";

    console.log(`🚀 Attempting to deduct $${Math.abs(amount)} from MT5 account ${login}...`);

    try {
        // 1. Call Bridge
        const result = await adjustMT5Balance(login, amount, comment);
        console.log("✅ Bridge Response:", result);

        // 2. Optional: Sync CRM DB if found
        const { data: challenge } = await supabase
            .from('challenges')
            .select('id, current_balance, current_equity')
            .eq('login', login)
            .single();

        if (challenge) {
            console.log(`📝 Syncing CRM Database for ${login}...`);
            const newBalance = Number(challenge.current_balance) + amount; // amount is negative
            const newEquity = Number(challenge.current_equity) + amount;

            const { error: dbError } = await supabase
                .from('challenges')
                .update({
                    current_balance: newBalance,
                    current_equity: newEquity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', challenge.id);

            if (dbError) {
                console.error("❌ DB Update failed:", dbError.message);
            } else {
                console.log(`✅ CRM DB Updated. New Balance: ${newBalance}`);
            }
        } else {
            console.log("ℹ️ No matching challenge record found in CRM to sync.");
        }

    } catch (error: any) {
        console.error("❌ Error performing deduction:", error.message);
    }
}

main();

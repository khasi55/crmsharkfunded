
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'https://bridge.sharkfunded.co';
const API_KEY = process.env.MT5_API_KEY || '';

async function main() {
    const login = 889225368;
    console.log(`🚀 Enabling Account ${login}...`);

    // 1. Fetch Current State
    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.error("❌ Challenge not found");
        return;
    }

    console.log("Current DB State:", {
        status: challenge.status,
        equity: challenge.current_equity,
        sod: challenge.start_of_day_equity
    });

    // 2. Unbreach in DB
    // We set SOD to current equity to ensure Daily Drawdown is reset for today.
    // Otherwise, (Old SOD - Current Equity) might still trigger a breach.
    const newSOD = challenge.current_equity;

    console.log(`📝 Setting DB Status to 'active' and SOD to ${newSOD}...`);
    const { error } = await supabase
        .from('challenges')
        .update({
            status: 'active',
            start_of_day_equity: newSOD,
            metadata: {
                ...challenge.metadata,
                unbreached_at: new Date().toISOString(),
                unbreached_by: 'script_enable_889225368'
            }
        })
        .eq('login', login);

    if (error) {
        console.error("❌ DB Update Failed:", error.message);
        return;
    }
    console.log("✅ DB Updated.");

    // 3. Call Bridge to Enable
    console.log(`🔌 Calling Bridge Enable at ${BRIDGE_URL}/enable-account...`);
    try {
        const response = await fetch(`${BRIDGE_URL}/enable-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ login: Number(login) })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ Bridge Error (${response.status}):`, text);
        } else {
            const json = await response.json();
            console.log("✅ Bridge Response:", json);
        }

    } catch (e: any) {
        console.error("❌ Bridge Call Failed:", e.message);
    }
}

main();

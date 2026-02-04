
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixVolume() {
    console.log("Starting Volume Fix...");

    // Heuristic: If lots > 500, it's likely raw (4000 etc). 
    // Max valid lot size usually < 100 (which would be 10000 stored? No, stored as Lots*100).
    // If someone traded 100 lots, DB would have 10000.
    // If raw 4000 (0.4 lots) -> DB has 4000.
    // We want 40.

    // So if check trades > 1000 is safe?
    // 10 lots = 1000.
    // 10 lots is possible.
    // But 0.4 lots -> 4000.
    // So 4000 is definitely wrong for a retail 0.4 lot trade.

    // Let's target the known bad ones first or range.
    // The user issue is recent.

    const { data: trades, error } = await supabase
        .from('trades')
        .select('ticket, lots, symbol')
        .gt('lots', 500) // 5 lots? No, 500 means 5 lots if correct scale? 
    // Wait, if scale is Lots*100.
    // 5 lots = 500.
    // 100 lots = 10000.
    // Raw 4000 = 4000.
    // 4000 > 500.
    // But 10 lots (1000) > 500.
    // So we can't just fix all > 500.

    // Look at PL ratio?
    // Or just target today's trades?
    // User said "coming back to 40 lots".

    // Filter by timestamp?
    // Or specific tickets from debug?
    // 6520622, 6520621, 6520655.

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${trades?.length} large lot trades.`);

    for (const t of trades || []) {
        // Safe check: Only standard lots on XAUUSD/Forex?
        // Raw 4000 -> 40.
        // If we adjust, we assume it was RAW.
        // Fix: Divide by 100.

        // Let's fix specific tickets first to confirm.
        if ([6520655, 6520621, 6520622].includes(t.ticket)) {
            console.log(`Fixing ${t.ticket}: ${t.lots} -> ${t.lots / 100}`);
            await supabase.from('trades').update({ lots: t.lots / 100 }).eq('ticket', t.ticket);
        } else {
            // For others, we might need a more general rule.
            // If lots >= 1000 AND (lots % 100 == 0)?
            // Raw 4000 is divisible by 100.
            // Raw 1000 is divisible by 100.
            // Real 5.12 lots -> 512.
        }
    }

    // General Fix for today?
    const today = new Date().toISOString().split('T')[0];
    const { data: recentTrades } = await supabase
        .from('trades')
        .select('*')
        .gte('open_time', today)
        .gt('lots', 1000); // Only fix obviously huge ones (>10 lots?)

    console.log(`Found ${recentTrades?.length} recent large trades to potentially fix.`);
    for (const t of recentTrades || []) {
        const newLots = t.lots / 100;
        console.log(`Auto-Fixing ${t.ticket}: ${t.lots} -> ${newLots}`);
        await supabase.from('trades').update({ lots: newLots }).eq('ticket', t.ticket);
    }
}

fixVolume();

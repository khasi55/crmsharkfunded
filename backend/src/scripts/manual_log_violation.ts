
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function logManualViolation() {
    const login = '900909491005';
    const ticket = '8074295';
    const violationType = 'tick_scalping';

    console.log(`🛠️ Manually logging violation for Account ${login}, Ticket ${ticket}...`);

    // 1. Fetch Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('id, user_id')
        .eq('login', login)
        .single();

    if (cError || !challenge) {
        console.error("❌ Challenge not found:", cError);
        return;
    }

    // 2. Fetch Trade Details (for metadata)
    const { data: trade, error: tError } = await supabase
        .from('trades')
        .select('*')
        .eq('ticket', ticket)
        .eq('challenge_id', challenge.id)
        .single();

    if (tError || !trade) {
        console.error("❌ Trade not found:", tError);
        return;
    }

    const duration = (new Date(trade.close_time!).getTime() - new Date(trade.open_time).getTime()) / 1000;

    // 3. Insert Violation
    const violationData = {
        challenge_id: challenge.id,
        user_id: challenge.user_id,
        flag_type: violationType,
        severity: 'breach', // Tick Scalping is severe
        description: `Scalping Detected (Manual Fix): Duration ${duration}s < Minimum 60s`,
        trade_ticket: ticket,
        symbol: trade.symbol,
        analysis_data: {
            duration_seconds: duration,
            manual_entry: true,
            timestamp: new Date()
        }
    };

    const { error: iError } = await supabase
        .from('advanced_risk_flags')
        .insert(violationData);

    if (iError) {
        console.error("❌ Failed to insert violation:", iError);
    } else {
        console.log("✅ Violation successfully logged!");
        console.table(violationData);
    }
}

logManualViolation();

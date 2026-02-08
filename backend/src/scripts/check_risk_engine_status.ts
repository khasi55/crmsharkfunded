
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRiskEngineStatus() {
    console.log('🔍 Checking Advanced Risk Engine Status...');

    try {
        // 1. Check for recent flags in the database
        const { data: recentFlags, error } = await supabase
            .from('advanced_risk_flags')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Error fetching recent risk flags:', error.message);
        } else {
            console.log(`✅ Found ${recentFlags.length} recent risk flags.`);
            if (recentFlags.length > 0) {
                console.log('Last flag:', recentFlags[0]);
            } else {
                console.log('⚠️ No recent risk flags found. This could mean no violations have occurred, or the engine is not processing events.');
            }
        }

        // 2. Check for recent trade updates to verify event flow
        const { data: recentTrades, error: tradeError } = await supabase
            .from('trades')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1);

        if (tradeError) {
            console.error('❌ Error fetching recent trades:', tradeError.message);
        } else if (recentTrades && recentTrades.length > 0) {
            console.log(`✅ Latest trade recorded at: ${recentTrades[0].created_at}`);
        } else {
            console.log('⚠️ No recent trades found.');
        }

    } catch (err: any) {
        console.error('❌ Unexpected error:', err);
    }
}

checkRiskEngineStatus();

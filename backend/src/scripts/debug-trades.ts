
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrades() {
    // 1. Find the challenge
    const { data: challenges, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', 889224326) // Target specific account
        .limit(1);

    if (cError) {
        console.error('Error fetching challenges:', cError);
        return;
    }

    console.log(`Found ${challenges.length} active challenges.`);

    for (const c of challenges) {
        console.log(`\nChecking Challenge: ${c.id} (Login: ${c.login})`);

        const { data: trades, error: tError } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', c.id);

        if (tError) {
            console.error('Error fetching trades:', tError);
            continue;
        }

        console.log(`  - Found ${trades?.length} trades.`);
        if (trades && trades.length > 0) {
            console.log(`  - Sample Trade:`, JSON.stringify(trades[0], null, 2));

            // Analyze Types
            const types = [...new Set(trades.map(t => t.type))];
            console.log(`  - Unique Types: ${types.join(', ')}`);
        }
    }
}

checkTrades();

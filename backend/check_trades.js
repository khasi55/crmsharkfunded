const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrades() {
    // Check specific problematic account
    const login = 680962710;

    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (challenge) {
        console.log(`FULL Challenge Record for ${login}:`, challenge);

        // Check for trades
        const { data: trades } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', challenge.id);

        console.log(`Trades count: ${trades?.length || 0}`);
        if (trades && trades.length > 0) {
            console.log('Trades:', trades);
        }
    } else {
        console.log("Challenge not found for login:", login);
    }
}

checkTrades();

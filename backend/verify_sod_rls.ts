import { supabase } from './src/lib/supabase';

async function checkRLSandSOD() {
    console.log("=== Checking SOD ===");
    const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, login, initial_balance, start_of_day_equity, current_equity, status')
        .in('login', [900909494567, 900909493639, 900909494837, 900909494558, 900909492851, 900909494668, 900909494628, 900909494841, 900909494571, 900909494373, 900909494891, 900909494030, 900909494422, 900909493885, 900909494554, 900909493913])
        .order('login', { ascending: true });

    if (challengeError) {
        console.error("Error fetching challenges:", challengeError);
    } else {
        console.table(challenges.map(c => ({
            Login: c.login,
            Status: c.status,
            Initial: c.initial_balance,
            SOD: c.start_of_day_equity,
            Current: c.current_equity
        })));
    }

    // Attempt a dummy insert using the loaded supabase client
    console.log("\n=== Checking RLS Insert ===");
    if (challenges && challenges.length > 0) {
        const dummyTrade = {
            ticket: 999999999,
            challenge_id: challenges[0].id,
            symbol: 'TEST',
            type: 'buy',
            lots: 0.1,
            open_price: 1.0,
            profit_loss: 0,
            open_time: new Date().toISOString()
        };
        const { error: insertError } = await supabase
            .from('trades')
            .upsert([dummyTrade], { onConflict: 'challenge_id, ticket' });

        if (insertError) {
            console.error("❌ RLS Insert Failed:", insertError);
            console.log("Hint: If this fails here, the supabase client has the wrong key or is dropping auth.");
        } else {
            console.log("✅ RLS Insert Succeeded! Removing dummy trade...");
            await supabase.from('trades').delete().eq('ticket', 999999999).eq('challenge_id', challenges[0].id);
        }
    }
}

checkRLSandSOD();

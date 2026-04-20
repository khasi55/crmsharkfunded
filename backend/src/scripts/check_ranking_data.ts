import { supabase } from '../lib/supabase';
async function run() {
    const { count: challengeCount, error: challengeError } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    console.log('Active Challenges Count:', challengeCount);
    if (challengeError) console.error('Challenge Error:', challengeError);

    const { count: tradeCount, error: tradeError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true });

    console.log('Total Trades Count:', tradeCount);
    if (tradeError) console.error('Trade Error:', tradeError);
}
run();

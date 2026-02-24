import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
    console.log('Searching for $5,000 challenges...');
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('initial_balance', 5000)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!challenges || challenges.length === 0) {
        console.log('No $5,000 challenges found.');
        return;
    }

    for (const c of challenges) {
        console.log(`\nID: ${c.id}`);
        console.log(`Login: ${c.login}`);
        console.log(`Balance: ${c.current_balance}`);
        console.log(`Equity: ${c.current_equity}`);
        console.log(`Status: ${c.status}`);
        console.log(`Type: ${c.challenge_type}`);

        const { data: trades } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', c.id);

        console.log(`Trades Found: ${trades?.length || 0}`);
        if (trades && trades.length > 0) {
            let totalProfit = 0;
            trades.forEach(t => {
                totalProfit += Number(t.profit_loss);
            });
            console.log(`Total PnL from trades: ${totalProfit}`);
            if (Math.abs(totalProfit - (-15.40)) < 0.01) {
                console.log('>>> THIS IS LIKELY THE ACCOUNT (PnL matches -15.40)');
            }
        }
    }
}

check();

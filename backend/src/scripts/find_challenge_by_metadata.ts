import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function search() {
    const searchId = 'SF-52c197a3';
    console.log(`Searching for metadata mapping to "${searchId}"...`);

    // Fetch all challenges and filter manually if indexed search is tricky
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*');

    if (error) {
        console.error('Error fetching challenges:', error);
        return;
    }

    const match = challenges?.find(c => JSON.stringify(c.metadata).includes(searchId));

    if (match) {
        console.log('Found matching challenge:');
        console.log(`ID: ${match.id}`);
        console.log(`Login: ${match.login}`);
        console.log(`Current Balance: ${match.current_balance}`);
        console.log(`Initial Balance: ${match.initial_balance}`);
        console.log(`Metadata:`, JSON.stringify(match.metadata, null, 2));

        // Now check trades for this challenge
        const { data: trades } = await supabase
            .from('trades')
            .select('*')
            .eq('challenge_id', match.id);

        console.log(`\nTrades Found: ${trades?.length || 0}`);
        if (trades && trades.length > 0) {
            let totalProfit = 0;
            trades.forEach(t => {
                const profit = Number(t.profit_loss) || 0;
                const comm = Number(t.commission) || 0;
                const swap = Number(t.swap) || 0;
                const net = profit + comm + swap;
                totalProfit += net;
                console.log(`Trade Ticket: ${t.ticket}, Net Profit: ${net.toFixed(2)}`);
            });
            console.log(`\nTotal Accumulated PnL: ${totalProfit.toFixed(2)}`);
        }
    } else {
        console.log(`No challenge found matching "${searchId}"`);
    }
}

search();

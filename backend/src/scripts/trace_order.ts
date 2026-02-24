import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function search() {
    const searchId = 'SF-52c197a3';
    console.log(`Searching for "${searchId}" in payment_orders...`);

    const { data: orders, error } = await supabase
        .from('payment_orders')
        .select('*')
        .ilike('order_id', `%${searchId}%`);

    if (error) {
        console.error('Error fetching order:', error);
        return;
    }

    if (orders && orders.length > 0) {
        console.log(`Found ${orders.length} matching order(s):`);
        for (const order of orders) {
            console.log(`\nOrder ID: ${order.order_id}`);
            console.log(`Status: ${order.status}`);
            console.log(`Amount: ${order.amount}`);
            console.log(`User ID: ${order.user_id}`);
            console.log(`Challenge ID: ${order.challenge_id}`);

            if (order.challenge_id) {
                const { data: challenge } = await supabase
                    .from('challenges')
                    .select('*')
                    .eq('id', order.challenge_id)
                    .single();

                if (challenge) {
                    console.log('--- Challenge Details ---');
                    console.log(`Login: ${challenge.login}`);
                    console.log(`Balance: ${challenge.current_balance}`);
                    console.log(`Equity: ${challenge.current_equity}`);
                    console.log(`Status: ${challenge.status}`);

                    const { data: trades } = await supabase
                        .from('trades')
                        .select('*')
                        .eq('challenge_id', challenge.id);

                    console.log(`Trades Found: ${trades?.length || 0}`);
                    if (trades) {
                        const totalPnL = trades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0) + (Number(t.commission) || 0) + (Number(t.swap) || 0), 0);
                        console.log(`Calculated Net PnL: ${totalPnL.toFixed(2)}`);
                    }
                }
            }
        }
    } else {
        console.log(`No order found matching "${searchId}"`);
    }
}

search();

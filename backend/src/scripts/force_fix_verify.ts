
import { supabase } from '../lib/supabase';

async function forceFixAndVerify() {
    const ticket = 8120684;
    console.log(`🛠 Force-updating ticket ${ticket} to BUY...`);

    // Update
    const { error: updateError } = await supabase
        .from('trades')
        .update({ type: 'buy' })
        .eq('ticket', ticket);

    if (updateError) {
        console.error('❌ Update failed:', updateError);
        return;
    }

    console.log('✅ Updated to BUY.');

    // Immediately verify
    const { data: trade, error: fetchError } = await supabase
        .from('trades')
        .select('ticket, type, profit_loss, open_price, close_price')
        .eq('ticket', ticket)
        .single();

    if (fetchError) {
        console.error('❌ Fetch failed:', fetchError);
        return;
    }

    console.log('\n--- Current DB State ---');
    console.log(JSON.stringify(trade, null, 2));
}

forceFixAndVerify();

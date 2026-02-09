
import { supabase } from '../lib/supabase';

async function fixTradeType() {
    const ticket = 8120684;
    console.log(`🛠 Fixing trade type for ticket ${ticket}...`);

    const { error } = await supabase
        .from('trades')
        .update({ type: 'buy' })
        .eq('ticket', ticket);

    if (error) {
        console.error('❌ Error updating trade:', error);
    } else {
        console.log('✅ Trade type updated to BUY.');
    }
}

fixTradeType();

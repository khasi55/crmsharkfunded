
import { supabase } from './src/lib/supabase';

async function search() {
    const id = '900909493081';
    console.log(`Searching for ${id} in all tables...`);

    const tables = [
        'challenges',
        'trades',
        'risk_violations',
        'advanced_risk_flags',
        'payment_orders',
        'payouts',
        'profiles'
    ];

    for (const table of tables) {
        // Search columns likely to have IDs
        const { data: columns } = await supabase.rpc('get_table_columns', { table_name: table });

        let query = supabase.from(table).select('*');

        if (table === 'challenges') {
            query = query.or(`login.eq.${id},id.eq.${id}`);
        } else if (table === 'trades') {
            query = query.or(`ticket.eq.${id},challenge_id.eq.${id}`);
        } else if (table === 'payment_orders') {
            query = query.or(`order_id.eq.${id},transaction_id.eq.${id},payment_id.eq.${id}`);
        } else {
            // Default to common ID columns if we don't know the schema well enough
            // But since I can't know columns easily without RPC, I'll just try common ones
            if (table === 'profiles') query = query.or(`email.ilike.%${id}%,id.eq.${id}`);
            else query = query.or(`id.eq.${id}`);
        }

        const { data, error } = await query;
        if (data && data.length > 0) {
            console.log(`Found in ${table}:`, JSON.stringify(data, null, 2));
        }
    }

    // Try a broad search in challenges metadata if not found
    const { data: metadataMatch } = await supabase
        .from('challenges')
        .select('*')
        .contains('metadata', { login: parseInt(id) });

    if (metadataMatch && metadataMatch.length > 0) {
        console.log('Found in challenges metadata (login):', JSON.stringify(metadataMatch, null, 2));
    }

    // Try a broad search in payment_orders metadata
    const { data: orderMetadataMatch } = await supabase
        .from('payment_orders')
        .select('*')
        .filter('metadata::text', 'ilike', `%${id}%`);

    if (orderMetadataMatch && orderMetadataMatch.length > 0) {
        console.log('Found in payment_orders metadata text:', JSON.stringify(orderMetadataMatch, null, 2));
    }

    // Search for login as number in challenges
    const { data: loginNumMatch } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', parseInt(id));

    if (loginNumMatch && loginNumMatch.length > 0) {
        console.log('Found in challenges login (as number):', JSON.stringify(loginNumMatch, null, 2));
    }
}

search();

import { supabase } from '../lib/supabase';

async function debugRLS() {
    console.log('--- Supabase Client Debug ---');

    // 1. Check if we are using Service Role or Anon Key
    // We can check this by trying to list users (requires service role)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
        perPage: 1
    });

    if (authError) {
        console.error('❌ Auth Admin Check Failed (Not using Service Role Key?):', authError.message);
    } else {
        console.log('✅ Auth Admin Check Passed (Using Service Role Key)');
    }

    // 2. Check RLS Policies for 'trades' table
    console.log('\n--- RLS Policies for "trades" table ---');
    const { data: policies, error: policyError } = await supabase.rpc('get_policies', { table_name: 'trades' });

    // If RPC doesn't exist, try raw query
    if (policyError) {
        console.log('RPC get_policies failed, trying raw query...');
        const { data: rawPolicies, error: rawError } = await supabase.from('pg_policies')
            .select('*')
            .eq('tablename', 'trades');

        if (rawError) {
            console.error('❌ Could not fetch policies:', rawError.message);
            // Try to use a system table query
            const { data: sqlPolicies, error: sqlError } = await supabase.from('_sql').select('*').limit(1); // placeholder for direct SQL if available
            console.log('Note: Direct SQL access via supabase client might be restricted.');
        } else {
            console.log('Raw Policies:', JSON.stringify(rawPolicies, null, 2));
        }
    } else {
        console.log('Policies:', JSON.stringify(policies, null, 2));
    }

    // 3. Test Insert into 'trades'
    console.log('\n--- Test Insert into "trades" ---');
    const testTrade = {
        ticket: 'DEBUG_TEST_' + Date.now(),
        challenge_id: '6316b6ca-8d45-493e-b752-5eb4064d22d1',
        user_id: 'dd5e83c9-f792-4b8d-872f-071c79f079ae',
        symbol: 'DEBUG',
        type: 'buy',
        lots: 0.01,
        open_price: 100,
        profit_loss: 0,
        open_time: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('trades').upsert(testTrade, { onConflict: 'challenge_id, ticket' });
    if (insertError) {
        console.error('❌ Upsert Failed:', insertError.message);
        if (insertError.message.includes('row-level security policy')) {
            console.error('   -> CONFIRMED: RLS Violation detected during UPSERT.');
        }
    } else {
        console.log('✅ Upsert Succeeded');
        // Clean up
        await supabase.from('trades').delete().eq('ticket', testTrade.ticket);
    }
}

debugRLS().catch(console.error);

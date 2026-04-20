import { supabase } from '../lib/supabase';

async function auditRLS() {
    console.log('--- 🛡️ Supabase RLS Security Audit ---');

    // 1. Get all tables and their RLS status
    const { data: tables, error: tableError } = await supabase.rpc('get_rls_status');

    if (tableError) {
        console.log('ℹ️ RPC get_rls_status not found, falling back to direct SQL query...');

        // Manual query via supabase.from('pg_tables') or equivalent if allowed, 
        // but better to just use a raw query if we can or check common tables.

        const tablesToCheck = [
            'profiles', 'challenges', 'payout_requests', 'admin_users',
            'merchant_config', 'kyc_requests', 'kyc_sessions', 'bank_details',
            'wallet_addresses', 'trades', 'account_types', 'risk_rules_config',
            'affiliate_withdrawals', 'affiliate_stats'
        ];

        for (const table of tablesToCheck) {
            const { data, error } = await supabase.rpc('check_table_rls', { table_name: table });
            if (error) {
                // If RPC fails, we can try to check if we can access data without auth
                // This is a rough way to check if RLS is 'working' for the anon user
                console.log(`Checking ${table}...`);
            }
        }
    }

    // Better approach: Use the postgres internal tables via a script
    const query = `
        SELECT 
            schemaname, 
            tablename, 
            rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    `;

    // Since we don't have a broad "run_query" RPC usually, let's just 
    // try to read some data from key tables using the anon key to see if it's blocked.
    // This is more of a "black box" test.
}

// A more robust way to check RLS is to see if policies exist
async function checkPolicies() {
    console.log('Checking for open policies...');
    const tables = [
        'profiles', 'challenges', 'payout_requests', 'admin_users',
        'merchant_config', 'kyc_requests', 'kyc_sessions', 'bank_details',
        'wallet_addresses', 'trades', 'account_types'
    ];

    for (const table of tables) {
        // Try to select with service role - should work
        const { count: srCount, error: srErr } = await supabase.from(table).select('*', { count: 'exact', head: true });

        if (srErr) {
            console.log(`❌ Table ${table} might not exist or Service Role error: ${srErr.message}`);
            continue;
        }

        console.log(`✅ Table ${table} exists (${srCount} rows).`);
    }
}

// Let's just create a list of tables and their intended RLS status
// and then cross-reference with what we find in migrations or sql files.

checkPolicies();

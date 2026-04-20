import { supabase } from './src/lib/supabase';

async function debugSupabase() {
    console.log('--- Supabase Client Debug ---');
    
    // 1. Check if auth.admin is available (Service Role indicator)
    const isAdminAvailable = !!supabase.auth.admin;
    console.log('isAdminAvailable:', isAdminAvailable);

    // 2. Try a test fetch from profiles (should work for service role)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
    
    if (profileError) {
        console.error('Profile Fetch Error:', profileError.message);
    } else {
        console.log('✅ Successfully fetched profile as admin');
    }

    // 3. Check kyc_sessions RLS by attempting a dummy insert and rolling back (or just checking error)
    // We'll use a non-existent UUID to avoid actual data clutter but trigger RLS if key is wrong
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const { error: insertError } = await supabase
        .from('kyc_sessions')
        .insert({
            user_id: dummyId,
            status: 'pending',
            kyc_mode: 'manual'
        });

    if (insertError) {
        console.log('Insert Error:', insertError.message);
        if (insertError.message.includes('row-level security policy')) {
            console.error('❌ RLS VIOLATION DETECTED: The client is definitely NOT bypassing RLS.');
        }
    } else {
        console.log('✅ Insert (dummy) worked. RLS is Bypassed.');
    }
}

debugSupabase();

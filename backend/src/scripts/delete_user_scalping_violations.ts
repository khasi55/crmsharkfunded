import { supabase } from '../lib/supabase';

async function deleteTickScalpingViolations() {
    const email = 'khushwant8107@gmail.com';

    console.log(`Searching for user with email: ${email}`);

    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();

    if (fetchError || !profile) {
        console.error('User not found or error fetching profile:', fetchError);
        return;
    }

    console.log(`Found user: ${profile.full_name} (${profile.id})`);

    // 1. Check existing violations
    const { data: violations, error: listError } = await supabase
        .from('advanced_risk_flags')
        .select('*')
        .eq('user_id', profile.id)
        .eq('flag_type', 'tick_scalping');

    if (listError) {
        console.error('Error listing violations:', listError);
        return;
    }

    console.log(`Found ${violations?.length || 0} tick scalping violations for this user.`);

    if (!violations || violations.length === 0) {
        console.log('No violations to delete.');
        return;
    }

    // 2. Delete them
    const { error: deleteError } = await supabase
        .from('advanced_risk_flags')
        .delete()
        .eq('user_id', profile.id)
        .eq('flag_type', 'tick_scalping');

    if (deleteError) {
        console.error('Error deleting violations:', deleteError);
    } else {
        console.log(`✅ Successfully deleted all tick scalping violations for ${email}.`);
    }
}

deleteTickScalpingViolations();

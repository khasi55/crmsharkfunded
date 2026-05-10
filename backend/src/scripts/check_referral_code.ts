import { supabaseAdmin } from '../lib/supabase';

async function checkReferralCode() {
    console.log('Checking for profile with referral_code SAHIB...');
    
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, referral_code')
        .eq('referral_code', 'SAHIB')
        .single();

    if (error) {
        console.error('Error finding profile by referral_code:', error.message);
        
        // Let's also check if it's case insensitive or contains SAHIB
        const { data: profiles, error: err2 } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, referral_code')
            .ilike('referral_code', '%SAHIB%');
        
        if (profiles && profiles.length > 0) {
            console.log('Found profiles with similar referral_code:', profiles);
        } else {
            console.log('No profiles found with referral_code matching SAHIB.');
        }
    } else {
        console.log('Found profile by referral_code:', profile);
    }
}

checkReferralCode();

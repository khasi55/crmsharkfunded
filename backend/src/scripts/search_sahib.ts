import { supabaseAdmin } from '../lib/supabase';

async function searchSahib() {
    console.log('Searching for any mention of SAHIB in profiles...');
    
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%SAHIB%,email.ilike.%SAHIB%`);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Found profiles:', profiles.map(p => ({
            id: p.id,
            email: p.email,
            name: p.full_name,
            referred_by: p.referred_by,
            referral_code: p.referral_code
        })));
    }
}

searchSahib();

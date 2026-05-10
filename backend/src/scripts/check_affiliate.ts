import { supabaseAdmin } from '../lib/supabase';

async function checkAffiliate() {
    console.log('Checking for affiliate with code SAHIB or name SAHIB...');
    
    // Check if SAHIB is an affiliate code
    // I need to know which table stores affiliate codes. 
    // Usually it's in profiles or a separate affiliates table.
    
    const { data: profileWithCode, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, affiliate_code')
        .or(`affiliate_code.eq.SAHIB,full_name.ilike.%SAHIB%`);

    if (profileError) {
        console.error('Error searching profiles:', profileError.message);
    } else {
        console.log('Profiles matching SAHIB:', profileWithCode);
    }
}

checkAffiliate();

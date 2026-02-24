import { supabase } from '../lib/supabase';

async function updateBankDetails() {
    const email = 'ayushbhimani278@gmail.com';
    const bankDetails = {
        name: 'AYUSH JAYESHBHAI BHIMANI',
        bank_name: 'HDFC',
        account_number: '50100741409697',
        ifsc_code: 'HDFC0004578'
    };

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

    // 1. Update Profile (Name)
    console.log(`Updating profiles table for user ${profile.id}...`);
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: bankDetails.name
        })
        .eq('id', profile.id);

    if (profileError) {
        console.error('Error updating profiles:', profileError);
    } else {
        console.log('✅ Updated profiles table.');
    }

    // 2. Upsert Bank Details
    console.log(`Upserting bank_details for user ${profile.id}...`);
    const { error: bankError } = await supabase
        .from('bank_details')
        .upsert({
            user_id: profile.id,
            account_holder_name: bankDetails.name,
            bank_name: bankDetails.bank_name,
            account_number: bankDetails.account_number,
            ifsc_code: bankDetails.ifsc_code,
            is_locked: false // Ensure it's not locked so user can see it
        }, { onConflict: 'user_id' });

    if (bankError) {
        console.error('Error upserting bank_details:', bankError);
    } else {
        console.log('✅ Updated bank_details table.');
    }
}

updateBankDetails();

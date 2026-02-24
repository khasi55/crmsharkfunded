import { supabase } from '../lib/supabase';

async function updateBankDetails() {
    const email = 'jaik96677@gmail.com';
    const bankDetails = {
        name: 'Jai Karan',
        bank_name: 'Kotak Mahindra Bank',
        account_number: '4850788835',
        ifsc_code: 'KKBK0004674',
        account_type: 'Savings',
        phone: '9311439182'
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

    // 1. Update Profile (Name and Phone)
    console.log(`Updating profiles table for user ${profile.id}...`);
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: bankDetails.name,
            phone: bankDetails.phone,
            phone_number: bankDetails.phone // Compatibility
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

        // Try to see what columns are actually there if it fails again
        const { data: sample } = await supabase.from('bank_details').select('*').limit(1);
        if (sample) {
            console.log('Sample data from bank_details:', sample[0]);
        }
    } else {
        console.log('✅ Updated bank_details table.');
    }
}

updateBankDetails();

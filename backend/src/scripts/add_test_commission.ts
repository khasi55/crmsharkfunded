import { supabaseAdmin } from '../lib/supabase';

async function main() {
    const email = 'siddareddy1947@gmail.com';
    const amountToAdd = 10;

    console.log(`Searching for user: ${email}`);

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, wallet_balance, total_commission')
        .ilike('email', email)
        .maybeSingle();

    if (error) {
        console.error('Error finding user:', error);
        return;
    }

    if (!profile) {
        console.error('User not found');
        return;
    }

    console.log('User profile found:', profile);

    const newBalance = (profile.wallet_balance || 0) + amountToAdd;
    const newTotalCommission = (profile.total_commission || 0) + amountToAdd;

    console.log(`Updating wallet_balance to ${newBalance} and total_commission to ${newTotalCommission}`);

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            wallet_balance: newBalance,
            total_commission: newTotalCommission
        })
        .eq('id', profile.id)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating profile:', updateError);
    } else {
        console.log('✅ Successfully added commission. Updated profile:', updatedProfile);
    }
}

main();

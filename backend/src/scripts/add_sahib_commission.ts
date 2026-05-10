import { supabaseAdmin } from '../lib/supabase';

async function addCommission() {
    const userId = 'ca4bfd6f-f298-4d46-98e2-236761fb3da6'; // SahibNoor Singh
    const orderId = 'SF1777625672193X5BI3GAEK';
    const amount = 29.2; // 10% of $292

    console.log(`Adding $${amount} commission for user ${userId} for order ${orderId}`);

    // 1. Fetch current profile to ensure accurate increment
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('total_commission, wallet_balance')
        .eq('id', userId)
        .single();

    const currentTotal = Number(profile?.total_commission) || 0;
    const currentWallet = Number(profile?.wallet_balance) || 0;

    // 2. Insert into affiliate_earnings
    const { data: earning, error: earningError } = await supabaseAdmin
        .from('affiliate_earnings')
        .insert({
            referrer_id: userId,
            referred_user_id: userId,
            amount: amount,
            commission_type: 'direct',
            status: 'completed',
            description: `Commission for order ${orderId} ($292)`,
            metadata: {
                order_id: orderId,
                purchase_amount: 292,
                commission_rate: 10,
                manual_addition: true
            }
        })
        .select()
        .single();

    if (earningError) {
        console.error('Error inserting earning:', earningError);
        return;
    }

    console.log('✅ Earning record created:', earning.id);

    // 3. Update profile
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            total_commission: currentTotal + amount,
            wallet_balance: currentWallet + amount
        })
        .eq('id', userId)
        .select()
        .single();

    if (profileError) {
        console.error('Error updating profile:', profileError);
    } else {
        console.log('✅ Profile updated.');
        console.log(`   Previous: Total $${currentTotal}, Wallet $${currentWallet}`);
        console.log(`   New: Total $${updatedProfile.total_commission}, Wallet $${updatedProfile.wallet_balance}`);
    }
}

addCommission();


import { supabase } from '../lib/supabase';

const email = 'nakodajimandir@gmail.com';
const walletAddress = 'THe87bt4szG3Ew1p5CRVA4yxoMJXswrXhM';

async function updateWallet() {
    try {
        console.log(`--- Updating wallet for ${email} ---`);

        // 1. Get User ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            console.error('❌ Error finding profile:', profileError?.message || 'Profile not found');
            return;
        }

        const userId = profile.id;
        console.log(`✅ User found: ${profile.full_name} (${userId})`);

        // 2. Check current wallet
        const { data: existingWallet } = await supabase
            .from('wallet_addresses')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (existingWallet) {
            console.log(`ℹ️ Existing wallet found: ${existingWallet.wallet_address}. Updating...`);
            const { error: updateError } = await supabase
                .from('wallet_addresses')
                .update({
                    wallet_address: walletAddress,
                    is_locked: true,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) {
                console.error('❌ Error updating wallet address:', updateError.message);
            } else {
                console.log('✅ Wallet address updated successfully.');
            }
        } else {
            console.log('ℹ️ No existing wallet found. Inserting new record...');
            const { error: insertError } = await supabase
                .from('wallet_addresses')
                .insert({
                    user_id: userId,
                    wallet_address: walletAddress,
                    is_locked: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('❌ Error inserting wallet address:', insertError.message);
            } else {
                console.log('✅ Wallet address inserted successfully.');
            }
        }

        // 3. Update pending payout requests (even if earlier check said 0, good to have)
        console.log('Checking for pending payout requests...');
        const { data: pendingRequests, error: fetchError } = await supabase
            .from('payout_requests')
            .select('id, metadata')
            .eq('user_id', userId)
            .eq('status', 'pending');

        if (fetchError) {
            console.error('❌ Error fetching pending requests:', fetchError.message);
        } else if (pendingRequests && pendingRequests.length > 0) {
            console.log(`Found ${pendingRequests.length} pending requests.`);
            for (const req of pendingRequests) {
                const updatedMetadata = typeof req.metadata === 'object' ? { ...req.metadata } : {};
                const { error: updateReqError } = await supabase
                    .from('payout_requests')
                    .update({
                        wallet_address: walletAddress,
                        metadata: {
                            ...updatedMetadata,
                            payout_destination_updated: walletAddress,
                            update_reason: 'Admin requested update'
                        }
                    })
                    .eq('id', req.id);

                if (updateReqError) {
                    console.error(`❌ Error updating payout request ${req.id}:`, updateReqError.message);
                } else {
                    console.log(`✅ Updated payout request ${req.id} with new wallet address.`);
                }
            }
        } else {
            console.log('ℹ️ No pending payout requests found to update.');
        }

        console.log('--- Done ---');
    } catch (err: any) {
        console.error('UNEXPECTED ERROR:', err.message);
    }
}

updateWallet();

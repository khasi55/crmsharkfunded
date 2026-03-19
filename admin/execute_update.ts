import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = 'faizanmalik2032@gmail.com';
    const newSwiftCode = 'SBININBB503';
    const newWalletAddress = 'UQC29LBODegOLvjZyiCwYDicsofzpSd7f0CduG2KvThI9FN-';

    console.log(`--- Updating details for ${email} ---`);

    // 1. Find User ID
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError || !profile) {
        console.error('❌ Error finding profile:', profileError?.message || 'Profile not found');
        return;
    }

    const userId = profile.id;
    console.log(`✅ User ID: ${userId}`);

    // 2. Update bank_details
    console.log(`Updating bank_details with Swift Code: ${newSwiftCode}...`);
    const { error: bankUpdateError } = await supabase
        .from('bank_details')
        .update({
            swift_code: newSwiftCode,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    if (bankUpdateError) {
        console.error('❌ Error updating bank_details:', bankUpdateError.message);
    } else {
        console.log('✅ bank_details updated successfully.');
    }

    // 3. Update wallet_addresses
    console.log(`Updating wallet_addresses with Address: ${newWalletAddress}...`);
    const { data: existingWallet } = await supabase
        .from('wallet_addresses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingWallet) {
        const { error: walletUpdateError } = await supabase
            .from('wallet_addresses')
            .update({
                wallet_address: newWalletAddress,
                is_locked: true,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (walletUpdateError) {
            console.error('❌ Error updating wallet_address:', walletUpdateError.message);
        } else {
            console.log('✅ wallet_address updated successfully.');
        }
    } else {
        console.log('Inserting new wallet_address record...');
        const { error: walletInsertError } = await supabase
            .from('wallet_addresses')
            .insert({
                user_id: userId,
                wallet_address: newWalletAddress,
                wallet_type: 'USDT (TRC-20)',
                is_locked: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (walletInsertError) {
            console.error('❌ Error inserting wallet_address:', walletInsertError.message);
        } else {
            console.log('✅ wallet_address inserted successfully.');
        }
    }

    // 4. Update pending payout requests
    console.log('Checking for pending payout requests...');
    const { data: pendingRequests, error: fetchError } = await supabase
        .from('payout_requests')
        .select('id, payout_method, bank_details')
        .eq('user_id', userId)
        .eq('status', 'pending');

    if (fetchError) {
        console.error('❌ Error fetching pending requests:', fetchError.message);
    } else if (pendingRequests && pendingRequests.length > 0) {
        for (const req of pendingRequests) {
            const updates: any = {
                updated_at: new Date().toISOString()
            };

            if (req.payout_method === 'crypto') {
                updates.wallet_address = newWalletAddress;
            } else if (req.payout_method === 'bank_transfer') {
                const updatedBankDetails = {
                    ...(req.bank_details as object || {}),
                    swift_code: newSwiftCode
                };
                updates.bank_details = updatedBankDetails;
            }

            const { error: updateReqError } = await supabase
                .from('payout_requests')
                .update(updates)
                .eq('id', req.id);

            if (updateReqError) {
                console.error(`❌ Error updating payout request ${req.id}:`, updateReqError.message);
            } else {
                console.log(`✅ Updated payout request ${req.id}.`);
            }
        }
    } else {
        console.log('ℹ️ No pending payout requests found.');
    }

    console.log('--- Update Complete ---');
}

main();

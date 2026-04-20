import { supabaseAdmin } from '../lib/supabase';

async function mergeAccounts() {
    const duplicateId = '4885a268-1880-42c9-a94f-ebb91c82a2a2'; // Empty duplicate
    const realId = 'ceb26d32-e5c2-400a-98c2-94e617243dab';      // Has 2 challenges
    const newEmail = 'royalrajputana765@gmail.com';

    console.log(`--- DELETING DUPLICATE ACCOUNT: ${duplicateId} ---`);
    
    // 1. Delete from profiles
    const { error: pDeleteErr } = await supabaseAdmin.from('profiles').delete().eq('id', duplicateId);
    if (pDeleteErr) {
        console.error('Failed to delete duplicate profile:', pDeleteErr);
    } else {
        console.log('Duplicate profile deleted.');
    }

    // 2. Delete from auth.users
    const { error: aDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(duplicateId);
    if (aDeleteErr) {
        console.error('Failed to delete duplicate auth user:', aDeleteErr);
    } else {
        console.log('Duplicate auth user deleted.');
    }

    console.log(`--- UPDATING REAL ACCOUNT AUTH EMAIL: ${realId} to ${newEmail} ---`);

    // 3. Update Auth email for REAL account
    const { data: authData, error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(
        realId,
        { email: newEmail, email_confirm: true }
    );

    if (authUpdateErr) {
        console.error('Failed to update real account auth email:', authUpdateErr);
    } else {
        console.log('Auth email updated successfully for real account.');
    }
}

mergeAccounts();

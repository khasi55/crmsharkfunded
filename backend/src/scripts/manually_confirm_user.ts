import { supabaseAdmin } from '../lib/supabase';

async function manuallyConfirmUser() {
    const email = 'kunnthuwealth3004@gmail.com';
    const userId = '35ac13a4-fc0d-4e53-9efe-60474bbc370f';

    console.log(`Manually confirming email for: ${email} (${userId})`);

    try {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
        );

        if (error) throw error;

        console.log('RESULT: SUCCESS');
        console.log(`User ${data.user.email} is now confirmed at ${data.user.email_confirmed_at}`);
    } catch (err: any) {
        console.error('Error confirming user:', err.message);
    }
}

manuallyConfirmUser();

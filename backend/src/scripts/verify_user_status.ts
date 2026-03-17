import { supabaseAdmin } from '../lib/supabase';

async function verifyUserEmail() {
    const email = 'kunnthuwealth3004@gmail.com';
    console.log(`Checking verification for: ${email}`);

    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        const user = users.find((u: any) => u.email === email);
        if (!user) {
            console.log('RESULT: USER_NOT_FOUND');
            return;
        }

        console.log('RESULT: FOUND');
        console.log(`Email: ${user.email}`);
        console.log(`Email Confirmed At: ${user.email_confirmed_at || 'NOT_CONFIRMED'}`);
        console.log(`Is Verified: ${!!user.email_confirmed_at}`);
    } catch (err: any) {
        console.error('Error verifying user:', err.message);
    }
}

verifyUserEmail();

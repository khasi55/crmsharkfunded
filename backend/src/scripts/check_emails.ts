import { supabaseAdmin } from '../lib/supabase';

async function checkEmails() {
    const oldEmail = 'harshitkadela6@gmail.com';
    const newEmail = 'royalrajputana765@gmail.com';

    console.log('--- Profiling Tables ---');
    const { data: p1 } = await supabaseAdmin.from('profiles').select('*').eq('email', oldEmail);
    const { data: p2 } = await supabaseAdmin.from('profiles').select('*').eq('email', newEmail);
    console.log(`Profile with old email (${oldEmail}):`, p1?.length);
    console.log(`Profile with new email (${newEmail}):`, p2?.length);

    console.log('--- Auth Users ---');
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error('List users failed:', error);
        return;
    }

    const u1 = users.find(u => u.email === oldEmail);
    const u2 = users.find(u => u.email === newEmail);
    console.log(`Auth user with old email:`, u1 ? { id: u1.id, email: u1.email } : 'Not found');
    console.log(`Auth user with new email:`, u2 ? { id: u2.id, email: u2.email } : 'Not found');
}

checkEmails();

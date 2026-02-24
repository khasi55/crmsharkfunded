import { supabase } from '../lib/supabase';

async function findUser() {
    const email = 'rushikumbhar1997@gmail.com';
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', email)
        .maybeSingle();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data) {
        console.log('USER_FOUND:', JSON.stringify(data));
    } else {
        console.log('USER_NOT_FOUND');
    }
}

findUser();

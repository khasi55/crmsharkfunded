import { supabaseAdmin } from '../lib/supabase';

async function checkDuplicates() {
    const newEmail = 'royalrajputana765@gmail.com';
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', newEmail);
    
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('Profiles found for:', newEmail);
    console.log(JSON.stringify(profiles, null, 2));

    // Also check challenges for these IDs
    if (profiles && profiles.length > 0) {
        for (const p of profiles) {
            const { count } = await supabaseAdmin
                .from('challenges')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', p.id);
            console.log(`Challenges for user ${p.id} (${p.full_name}):`, count);
        }
    }
}

checkDuplicates();

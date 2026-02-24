import { supabase } from '../lib/supabase';

async function updateStatus(login: number) {
    console.log(`🚀 Updating status for ${login} to 'passed'...`);

    const { data: challenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('login', login)
        .single();

    if (!challenge) {
        console.error("Account not found");
        return;
    }

    const { error } = await supabase
        .from('challenges')
        .update({
            status: 'passed',
            updated_at: new Date()
        })
        .eq('id', challenge.id);

    if (error) {
        console.error("Update failed:", error.message);
    } else {
        console.log("✅ Status updated to 'passed'!");
    }
}

updateStatus(900909494939);

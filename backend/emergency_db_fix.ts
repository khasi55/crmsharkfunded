
import { supabase } from './src/lib/supabase';

async function fix() {
    const login = 900909493081;
    const newSodEquity = 10000;

    console.log(`🚀 Emergency Fix: Resetting SOD Equity for account ${login} to ${newSodEquity}`);

    const { data, error } = await supabase
        .from('challenges')
        .update({
            start_of_day_equity: newSodEquity,
            status: 'active' // Ensure it is active too
        })
        .eq('login', login)
        .select();

    if (error) {
        console.error('❌ Database Update Failed:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Update Successful:', JSON.stringify(data, null, 2));
    } else {
        console.log('⚠️ No record updated. Login not found?');
    }
}

fix();

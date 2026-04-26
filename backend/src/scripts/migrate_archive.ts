import { supabaseAdmin } from '../lib/supabase';

async function migrate() {
    console.log('🚀 Starting migration: Add is_archived to challenges');
    
    // We'll use the supabase-js type-safe approach to check if column exists 
    // but since we can't easily check column existence with the JS client 
    // for all environments, we'll try a simple update to see if it works, 
    // or better, run a raw SQL if possible.
    
    // Since we don't have a direct SQL executor in the client, 
    // we'll assume the column needs to be added via the Supabase dashboard
    // OR we can provide the SQL for the user.
    
    // HOWEVER, I can check if it exists by trying to select it.
    const { error: checkError } = await supabaseAdmin
        .from('challenges')
        .select('is_archived')
        .limit(1);

    if (checkError && checkError.code === '42703') {
        console.log('❌ Column is_archived does not exist. Please run the following SQL in Supabase SQL Editor:');
        console.log('ALTER TABLE challenges ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;');
    } else if (!checkError) {
        console.log('✅ Column is_archived already exists.');
    } else {
        console.error('Unexpected error checking column:', checkError);
    }
}

migrate();

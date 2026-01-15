
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkStatus() {
    // User ID from previous logs
    const userId = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';

    console.log(`🔍 Checking participation for User ID: ${userId}`);

    const { data: participations, error } = await supabase
        .from('competition_participants')
        .select('*, competition:competitions(title)')
        .eq('user_id', userId);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (participations && participations.length > 0) {
        console.log(`✅ User is JOINED to ${participations.length} competition(s):`);
        participations.forEach(p => {
            console.log(`   - Competition ID: ${p.competition_id} (Status: ${p.status})`);
        });
    } else {
        console.log('❌ User is NOT joined to any competition.');
    }
}

checkStatus();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkRecentAccounts() {
    console.log('\n=== RECENT MT5 ACCOUNTS (Last 10) ===\n');

    const { data: challenges } = await supabase
        .from('challenges')
        .select('id, user_id, login, server, status, created_at, competition_id')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!challenges || challenges.length === 0) {
        console.log('No challenges found');
        return;
    }

    for (const c of challenges) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', c.user_id)
            .single();

        // Check if this account is in competition_participants
        const { data: participation } = await supabase
            .from('competition_participants')
            .select('competition_id, status, score, rank')
            .eq('challenge_id', c.id)
            .maybeSingle();

        console.log(`Login: ${c.login}`);
        console.log(`  User: ${profile?.full_name || 'Unknown'} (${profile?.email || 'N/A'})`);
        console.log(`  Challenge Status: ${c.status}`);
        console.log(`  Competition ID (challenges table): ${c.competition_id || 'NOT SET'}`);

        if (participation) {
            console.log(`  ✅ IN competition_participants:`);
            console.log(`     Competition ID: ${participation.competition_id}`);
            console.log(`     Status: ${participation.status}`);
            console.log(`     Score: ${participation.score ?? 'N/A'}`);
            console.log(`     Rank: ${participation.rank ?? 'N/A'}`);
        } else {
            console.log(`  ❌ NOT in competition_participants table`);
        }

        console.log(`  Created: ${c.created_at}`);
        console.log('');
    }
}

checkRecentAccounts();

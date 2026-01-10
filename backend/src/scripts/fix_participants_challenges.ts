
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixParticipants() {
    console.log("Starting fix...");

    // 1. Get participants with missing challenge_id
    const { data: participants, error } = await supabase
        .from('competition_participants')
        .select('*')
        .is('challenge_id', null);

    if (error) {
        console.error("Error fetching participants:", error);
        return;
    }

    console.log(`Found ${participants.length} participants with missing challenge_id.`);

    for (const p of participants) {
        console.log(`Checking participant ${p.id} (User: ${p.user_id}, Comp: ${p.competition_id})...`);

        // 2. Find matching challenge
        // We look for a challenge for this user, where metadata->>competition_id matches
        // OR, simply the most recent active challenge if competition id in metadata is missing (fallback)
        // But strictly, we should check metadata.

        const { data: challenges, error: cError } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', p.user_id)
            .order('created_at', { ascending: false });

        if (cError) {
            console.error(`  Error fetching challenges for user ${p.user_id}:`, cError);
            continue;
        }

        // Filter in JS because JSONB query syntax can be tricky with string text
        const match = challenges.find((c: any) => {
            return c.metadata && String(c.metadata.competition_id) === String(p.competition_id);
        });

        if (match) {
            console.log(`  Found matching challenge: ${match.id}`);

            // 3. Update participant
            const { error: uError } = await supabase
                .from('competition_participants')
                .update({ challenge_id: match.id })
                .eq('id', p.id);

            if (uError) {
                console.error(`  Failed to update participant:`, uError);
            } else {
                console.log(`  Updated participant ${p.id} with challenge ${match.id}`);
            }
        } else {
            console.log(`  No matching challenge found.`);
        }
    }
    console.log("Done.");
}

fixParticipants();

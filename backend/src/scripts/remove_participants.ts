import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseKey) { console.error('Missing creds'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey) as any;

const COMPETITION_ID = '15579444-b28d-420d-aa40-c892b4551dd2';
const PARTICIPANT_IDS = [
    'feb07d75-a7f0-4fc5-a4bb-a3a128594661',
    '1356d221-ac0d-4731-89d2-c72d641a262f',
    'fe0e77ff-3b62-4625-b00c-5e65b7f18c96'
];
const CHALLENGE_IDS = [
    '2f877db1-4fd3-4857-99db-9fc7a4ee471c', // linked to 889227544 (khasireddy3)
    '22bbd76d-1768-450f-a7ce-e0ac0769d672', // linked to 889227547 (d3devansh32) - *Assumed ID, will verify in loop*
    // Wait, better to fetch challenge IDs from the participant records or login
];

async function removeParticipants() {
    console.log(`Removing 3 participants from competition ${COMPETITION_ID}...`);

    for (const pid of PARTICIPANT_IDS) {
        // 1. Get current participant to find challenge_id
        const { data: part } = await supabase.from('competition_participants').select('*').eq('id', pid).single();
        if (!part) {
            console.log(`Participant ${pid} not found (already deleted?)`);
            continue;
        }

        const challengeId = part.challenge_id;
        console.log(`Processing Participant ${pid} (Challenge: ${challengeId})`);

        // 2. Delete from competition_participants
        const { error: delError } = await supabase
            .from('competition_participants')
            .delete()
            .eq('id', pid);

        if (delError) {
            console.error(`Failed to delete participant ${pid}:`, delError);
        } else {
            console.log(`✅ Deleted participant record.`);
        }

        // 3. Update Challenge Metadata (remove link)
        if (challengeId) {
            const { data: challenge } = await supabase.from('challenges').select('metadata').eq('id', challengeId).single();
            if (challenge && challenge.metadata) {
                const newMeta = { ...challenge.metadata };
                delete newMeta.is_competition;
                delete newMeta.competition_id;

                const { error: upError } = await supabase
                    .from('challenges')
                    .update({ metadata: newMeta })
                    .eq('id', challengeId);

                if (upError) console.error(`Failed to update metadata for ${challengeId}:`, upError);
                else console.log(`✅ Updated challenge metadata.`);
            }
        }
    }
}

removeParticipants();

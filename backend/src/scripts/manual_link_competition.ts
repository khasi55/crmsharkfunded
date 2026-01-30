
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Adjusted for running from backend/src/scripts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EMAILS = ['fameindiamumbai@gmail.com', 'ketanofficial09@gmail.com'];
const COMPETITION_ID_TO_LINK = '9e6c278e-2cba-4dd6-bf3d-1201bd4c7983'; // 'Testing' Competition ID (from Step 346) that just ended?
// Or maybe user meant the UPCOMING one '9c207913-8634-4c34-b4c7-74e2d25c714d' (from Step 346).
// Step 346: 
// 'Testling' (Ended) ID: 9e6c278e...
// 'testing' (Upcoming) ID: 9c207913...

// I'll define both and check which one to link to. Assuming 'Upcoming' 'testing' one.
const TARGET_COMPETITION_ID = '9c207913-8634-4c34-b4c7-74e2d25c714d'; // The upcoming one

async function processUsers() {
    console.log(`Processing users: ${EMAILS.join(', ')}`);

    for (const email of EMAILS) {
        console.log(`\n--- Processing ${email} ---`);

        // 1. Find User
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('email', email);

        if (profileError || !profiles || profiles.length === 0) {
            console.error(`User not found for email: ${email}`);
            continue;
        }

        const user = profiles[0];
        console.log(`Found User: ${user.full_name} (${user.id})`);

        // 2. Find Challenges (Breached or Active)
        // We want the LATEST challenge
        const { data: challenges, error: challengeError } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (challengeError || !challenges || challenges.length === 0) {
            console.error(`No challenges found for user ${email}`);
            continue;
        }

        const challenge = challenges[0];
        console.log(`Found Challenge: Login ${challenge.login} (Status: ${challenge.status})`);

        // 3. Unbreach if needed
        if (challenge.status === 'breached' || challenge.status === 'failed') {
            console.log(`Unbreaching challenge ${challenge.id}...`);
            const { error: updateError } = await supabase
                .from('challenges')
                .update({
                    status: 'active',
                    metadata: { ...challenge.metadata, breached_at: null, reason: null, is_competition: true, competition_id: TARGET_COMPETITION_ID } // Link here too
                })
                .eq('id', challenge.id);

            if (updateError) console.error("Failed to unbreach:", updateError);
            else console.log("✅ Challenged Unbreached & Updated Metadata.");
        } else {
            console.log("Challenge is not breached. Updating metadata only...");
            const { error: updateError } = await supabase
                .from('challenges')
                .update({
                    metadata: { ...challenge.metadata, is_competition: true, competition_id: TARGET_COMPETITION_ID }
                })
                .eq('id', challenge.id);
            if (updateError) console.error("Failed to update metadata:", updateError);
            else console.log("✅ Metadata Updated.");
        }

        // 4. Link to Competition (Insert into competition_participants)
        // Check if exists first
        const { data: existing } = await supabase
            .from('competition_participants')
            .select('id')
            .eq('competition_id', TARGET_COMPETITION_ID)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            console.log("User is already in competition_participants.");
            // Ensure challenge_id is correct
            await supabase
                .from('competition_participants')
                .update({ challenge_id: challenge.id, status: 'active' })
                .eq('id', existing.id);
            console.log("Updated participant record.");
        } else {
            console.log("Inserting into competition_participants...");
            const { error: insertError } = await supabase
                .from('competition_participants')
                .insert({
                    competition_id: TARGET_COMPETITION_ID,
                    user_id: user.id,
                    challenge_id: challenge.id,
                    status: 'active'
                });

            if (insertError) console.error("Failed to insert participant:", insertError);
            else console.log("✅ User linked to competition.");
        }
    }
}

processUsers();

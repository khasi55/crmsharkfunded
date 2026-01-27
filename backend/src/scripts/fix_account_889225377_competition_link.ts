
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const accountLogin = '889225377';
    const correctChallengeId = 'a36a90b9-f565-4bc1-8535-e96a87614213'; // The actual account
    const competitionId = 'e9e0d221-4925-4437-9572-90ea8bc22c2c'; // Shark Battle Ground

    console.log(`🔗 Linking account ${accountLogin} to Shark Battle Ground competition...\n`);

    // 1. Find the account/challenge
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', accountLogin)
        .single();

    if (challengeError || !challenge) {
        console.error(`❌ Account ${accountLogin} not found`);
        return;
    }

    console.log(`✅ Found Account:`);
    console.log(`   - Challenge ID: ${challenge.id}`);
    console.log(`   - User ID: ${challenge.user_id}`);
    console.log(`   - Login: ${challenge.login}`);
    console.log(`   - Current Balance: $${challenge.current_balance}\n`);

    // 2. Check existing participant record
    const { data: existingParticipant } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('user_id', challenge.user_id)
        .eq('competition_id', competitionId)
        .single();

    if (existingParticipant) {
        console.log(`📝 Found existing participant record:`);
        console.log(`   - Current Challenge ID: ${existingParticipant.challenge_id}`);
        console.log(`   - Status: ${existingParticipant.status}`);
        console.log(`   - Rank: ${existingParticipant.rank}\n`);

        // Update to point to the correct challenge
        const { error: updateError } = await supabase
            .from('competition_participants')
            .update({
                challenge_id: correctChallengeId,
                status: 'active'
            })
            .eq('id', existingParticipant.id);

        if (updateError) {
            console.error('❌ Error updating participant:', updateError);
            return;
        } else {
            console.log('✅ Successfully updated participant record to link to account ' + accountLogin);
        }
    } else {
        console.log(`📝 No existing participant record found. Creating new one...\n`);

        // Create new participant record
        const { error: insertError } = await supabase
            .from('competition_participants')
            .insert({
                user_id: challenge.user_id,
                competition_id: competitionId,
                challenge_id: correctChallengeId,
                status: 'active',
                score: 0,
                rank: 9999
            });

        if (insertError) {
            console.error('❌ Error creating participant:', insertError);
            return;
        } else {
            console.log('✅ Successfully created participant record');
        }
    }

    // 3. Ensure challenge metadata is correct
    if (!challenge.metadata?.competition_id || challenge.metadata.competition_id !== competitionId) {
        const { error: metadataError } = await supabase
            .from('challenges')
            .update({
                metadata: {
                    ...challenge.metadata,
                    is_competition: true,
                    competition_id: competitionId,
                    competition_title: 'Shark Battle Ground',
                    linked_at: new Date().toISOString()
                },
                challenge_type: 'Competition'
            })
            .eq('id', correctChallengeId);

        if (metadataError) {
            console.error('❌ Error updating challenge metadata:', metadataError);
        } else {
            console.log('✅ Successfully updated challenge metadata');
        }
    } else {
        console.log('✅ Challenge metadata already correct');
    }

    console.log('\n🎉 Account 889225377 is now properly linked to Shark Battle Ground competition!\n');
}

main();

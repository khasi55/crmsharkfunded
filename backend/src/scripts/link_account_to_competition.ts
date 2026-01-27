
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const accountLogin = '889225377';

    console.log(`🔍 Searching for account with login: ${accountLogin}...\n`);

    // 1. Find the challenge/account
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', accountLogin)
        .single();

    if (challengeError || !challenge) {
        console.error(`❌ Account ${accountLogin} not found in challenges table`);
        console.error('Error:', challengeError);
        return;
    }

    console.log(`✅ Account Found:`);
    console.log(`   - Challenge ID: ${challenge.id}`);
    console.log(`   - User ID: ${challenge.user_id}`);
    console.log(`   - Login: ${challenge.login}`);
    console.log(`   - Status: ${challenge.status}`);
    console.log(`   - Current Balance: $${challenge.current_balance}`);
    console.log(`   - Metadata:`, challenge.metadata);

    // Check if already linked to a competition
    if (challenge.metadata?.competition_id) {
        console.log(`\n⚠️  This account is already linked to competition: ${challenge.metadata.competition_id}`);
    }

    // 2. List all active/upcoming competitions
    console.log(`\n📋 Available Competitions:\n`);
    const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true });

    if (compError || !competitions || competitions.length === 0) {
        console.error('❌ No active or upcoming competitions found');
        return;
    }

    competitions.forEach((comp: any, idx: number) => {
        console.log(`${idx + 1}. ${comp.title}`);
        console.log(`   - ID: ${comp.id}`);
        console.log(`   - Status: ${comp.status}`);
        console.log(`   - Entry Fee: $${comp.entry_fee || 0}`);
        console.log(`   - Start: ${new Date(comp.start_date).toLocaleDateString()}`);
        console.log(`   - End: ${new Date(comp.end_date).toLocaleDateString()}`);
        console.log('');
    });

    // 3. Check if user is already a participant in any competition
    const { data: existingParticipation } = await supabase
        .from('competition_participants')
        .select('*, competitions(title)')
        .eq('user_id', challenge.user_id);

    if (existingParticipation && existingParticipation.length > 0) {
        console.log(`\n📌 User's Current Competition Participation:\n`);
        existingParticipation.forEach((p: any) => {
            console.log(`   - Competition: ${p.competitions?.title || p.competition_id}`);
            console.log(`     Challenge ID: ${p.challenge_id || 'None'}`);
            console.log(`     Status: ${p.status}`);
            console.log(`     Rank: ${p.rank || 'N/A'}`);
            console.log('');
        });
    }

    // 4. Instructions for linking
    console.log(`\n📝 To link this account to a competition, update this script:`);
    console.log(`\n   const competitionId = 'PASTE_COMPETITION_ID_HERE';`);
    console.log(`\n   Then uncomment the linking code below and run again.\n`);

    // ===== UNCOMMENT THE CODE BELOW TO LINK =====
    /*
    const competitionId = 'PASTE_COMPETITION_ID_HERE'; // Replace with actual competition ID
    
    console.log(`\n🔗 Linking account ${accountLogin} to competition ${competitionId}...\n`);

    // Check if participant record exists
    const { data: existingParticipant } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('user_id', challenge.user_id)
        .eq('competition_id', competitionId)
        .single();

    if (existingParticipant) {
        // Update existing participant
        const { error: updateError } = await supabase
            .from('competition_participants')
            .update({
                challenge_id: challenge.id,
                status: 'active',
                score: 0,
                rank: 9999
            })
            .eq('id', existingParticipant.id);

        if (updateError) {
            console.error('❌ Error updating participant:', updateError);
        } else {
            console.log('✅ Successfully updated participant record');
        }
    } else {
        // Create new participant record
        const { error: insertError } = await supabase
            .from('competition_participants')
            .insert({
                user_id: challenge.user_id,
                competition_id: competitionId,
                challenge_id: challenge.id,
                status: 'active',
                score: 0,
                rank: 9999
            });

        if (insertError) {
            console.error('❌ Error creating participant:', insertError);
        } else {
            console.log('✅ Successfully created participant record');
        }
    }

    // Update challenge metadata to mark it as competition account
    const { error: metadataError } = await supabase
        .from('challenges')
        .update({
            metadata: {
                ...challenge.metadata,
                is_competition: true,
                competition_id: competitionId,
                linked_at: new Date().toISOString()
            },
            challenge_type: 'Competition'
        })
        .eq('id', challenge.id);

    if (metadataError) {
        console.error('❌ Error updating challenge metadata:', metadataError);
    } else {
        console.log('✅ Successfully updated challenge metadata');
    }

    console.log('\n✨ Account successfully linked to competition!\n');
    */
}

main();

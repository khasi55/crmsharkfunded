
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    const competitionId = 'e9e0d221-4925-4437-9572-90ea8bc22c2c'; // Shark Battle Ground

    console.log(`📊 Fetching Top 100 Participants for competition: ${competitionId}...\n`);

    // 1. Fetch Participants
    const { data: participants, error } = await supabase
        .from('competition_participants')
        .select(`
            user_id,
            score,
            rank,
            status,
            challenge_id
        `)
        .eq('competition_id', competitionId)
        .order('rank', { ascending: true })
        .limit(100);

    if (error) {
        console.error('❌ Error fetching leaderboard:', error);
        return;
    }

    if (!participants || participants.length === 0) {
        console.log('⚠️ No participants found.');
        return;
    }

    // 2. Fetch Profiles
    const userIds = participants.map(p => p.user_id).filter(Boolean);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    if (profileError) {
        console.error('❌ Error fetching profiles:', profileError);
        return;
    }
    const profileMap = new Map(profiles?.map(p => [p.id, p]));

    // 3. Fetch Challenges (for Balance/Equity)
    const challengeIds = participants.map(p => p.challenge_id).filter(Boolean);
    const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, initial_balance, current_equity')
        .in('id', challengeIds);

    if (challengeError) {
        console.error('❌ Error fetching challenges:', challengeError);
        return;
    }
    const challengeMap = new Map(challenges?.map(c => [c.id, c]));

    // 4. Build Dataset
    const rows: any[] = [];

    participants.forEach((p: any) => {
        const profile = profileMap.get(p.user_id);
        const challenge = challengeMap.get(p.challenge_id);

        rows.push({
            rank: p.rank,
            name: profile?.full_name || 'N/A',
            email: profile?.email || 'N/A',
            score: p.score?.toFixed(2) + '%',
            starting_equity: challenge?.initial_balance ?? 'N/A',
            current_equity: challenge?.current_equity ?? 'N/A',
            status: p.status
        });
    });

    // 5. Generate CSV
    const csvHeaders = ['Rank', 'Name', 'Email', 'Score', 'Starting Equity', 'Current Equity', 'Status'];
    const csvRows = rows.map(r => [
        r.rank,
        `"${r.name}"`, // Quote names in case of commas
        r.email,
        r.score,
        r.starting_equity,
        r.current_equity,
        r.status
    ].join(','));

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    // Save to file
    const outputPath = path.resolve(__dirname, '../../competition_top_100.csv');
    fs.writeFileSync(outputPath, csvContent);

    console.log(`\n✅ Successfully exported ${rows.length} participants to CSV.`);
    console.log(`📁 File saved at: ${outputPath}`);

    // Also print a preview
    console.log('\nPreview (Top 5):');
    console.table(rows.slice(0, 5));
}

main();

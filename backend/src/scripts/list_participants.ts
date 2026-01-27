
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);


async function listParticipants() {
    console.log("Fetching competition participants...");

    // 1. Fetch participants (base table)
    const { data: participants, error: pError } = await supabase
        .from('competition_participants')
        .select(`*`);

    if (pError) {
        console.error("Error fetching participants:", pError.message);
        return;
    }

    if (!participants || participants.length === 0) {
        console.log("No participants found.");
        return;
    }

    // 2. Collect IDs
    const userIds = [...new Set(participants.map(p => p.user_id).filter(Boolean))];
    const compIds = [...new Set(participants.map(p => p.competition_id).filter(Boolean))];
    const challengeIds = [...new Set(participants.map(p => p.challenge_id).filter(Boolean))];

    // 3. Fetch related data in batches
    console.log(`Fetching details for ${userIds.length} users, ${compIds.length} competitions...`);

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    const { data: competitions } = await supabase
        .from('competitions')
        .select('id, title')
        .in('id', compIds);

    const { data: challenges } = await supabase
        .from('challenges')
        .select('id, login, server')
        .in('id', challengeIds);

    // 4. Map data
    const profileMap = new Map(profiles?.map(p => [p.id, p]));
    const compMap = new Map(competitions?.map(c => [c.id, c]));
    const challengeMap = new Map(challenges?.map(c => [c.id, c]));

    const formatted = participants.map((p: any) => {
        const profile = profileMap.get(p.user_id);
        const competition = compMap.get(p.competition_id);
        const challenge = challengeMap.get(p.challenge_id);

        return {
            ParticipantId: p.id,
            Competition: competition?.title || 'Unknown',
            Name: profile?.full_name || 'Unknown',
            Email: profile?.email || 'Unknown',
            Login: challenge?.login || 'N/A',
            Server: challenge?.server || 'N/A',
            Status: p.status,
            JoinedAt: p.joined_at
        };
    });

    console.table(formatted);

    // Save to CSV
    const header = "ParticipantId,Competition,Name,Email,Login,Server,Status,JoinedAt";
    const rows = formatted.map((p: any) =>
        `"${p.ParticipantId}","${p.Competition}","${p.Name}","${p.Email}","${p.Login}","${p.Server}","${p.Status}","${p.JoinedAt}"`
    );
    const csvContent = [header, ...rows].join("\n");

    const outputPath = path.join(process.cwd(), 'competition_participants.csv');
    fs.writeFileSync(outputPath, csvContent);
    console.log(`\n✅ Saved complete list to: ${outputPath}`);
}


listParticipants();

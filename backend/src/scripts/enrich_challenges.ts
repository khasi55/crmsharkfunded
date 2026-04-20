import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function enrichChallenges() {
    const csvPath = path.resolve(__dirname, '../../../../challenges_list.csv');
    console.log(`📖 Reading CSV from: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error('❌ CSV file not found');
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const header = lines[0];
    const dataLines = lines.slice(1);

    const accounts: { login: string, originalLine: string }[] = dataLines.map(line => {
        const parts = line.split(',');
        return { login: parts[0], originalLine: line };
    });

    const logins = accounts.map(a => a.login);
    console.log(`🔍 Found ${logins.length} accounts in CSV. Fetching user details...`);

    // Fetch challenges to get user_id
    const { data: challenges, error: chalError } = await supabase
        .from('challenges')
        .select('login, user_id')
        .in('login', logins.map(l => Number(l)));

    if (chalError) {
        console.error('❌ Error fetching challenges:', chalError.message);
        return;
    }

    const userIds = [...new Set(challenges.map(c => c.user_id))];
    console.log(`👤 Found ${userIds.length} unique users. Fetching profiles...`);

    // Fetch profiles
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    if (profError) {
        console.error('❌ Error fetching profiles:', profError.message);
        return;
    }

    // Create maps for quick lookup
    const loginToUserId = new Map(challenges.map(c => [String(c.login), c.user_id]));
    const userIdToProfile = new Map(profiles.map(p => [p.id, p]));

    // Generate enriched CSV
    const newHeader = `${header},User Name,User Email`;
    const enrichedLines = accounts.map(acc => {
        const userId = loginToUserId.get(acc.login);
        const profile = userId ? userIdToProfile.get(userId) : null;
        return `${acc.originalLine},"${profile?.full_name || 'N/A'}","${profile?.email || 'N/A'}"`;
    });

    const enrichedCsv = [newHeader, ...enrichedLines].join('\n');
    const outputPath = path.resolve(__dirname, '../../../../challenges_list_enriched.csv');
    
    fs.writeFileSync(outputPath, enrichedCsv);
    console.log(`✅ Enriched CSV generated at: ${outputPath}`);
}

enrichChallenges().catch(err => {
    console.error('❌ Unexpected error:', err);
});

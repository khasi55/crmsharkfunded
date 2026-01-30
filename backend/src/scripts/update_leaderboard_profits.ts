
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in root/backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPETITION_ID = '9c207913-8634-4c34-b4c7-74e2d25c714d';

async function updateProfits() {
    console.log(`Fetching participants for competition ${COMPETITION_ID}...`);

    // Fetch participants linked to challenges
    const { data: participants, error } = await supabase
        .from('competition_participants')
        .select(`
            id,
            user_id,
            challenge_id,
            challenges (
                id,
                current_balance,
                initial_balance,
                current_equity,
                login,
                status,
                metadata
            ),
            profiles (
                full_name
            )
        `)
        .eq('competition_id', COMPETITION_ID);

    if (error || !participants) {
        console.error("Error fetching participants:", error);
        return;
    }

    console.log(`Found ${participants.length} participants.`);

    // Filter for those with 0% return
    const zeroProfitParticipants = participants.filter((p: any) => {
        const ch = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
        if (!ch) return false;
        const profit = ch.current_equity - ch.initial_balance;
        return Math.abs(profit) < 1;
    });

    console.log(`Found ${zeroProfitParticipants.length} participants with 0 profit.`);

    // Shuffle and pick 4-5 to update
    const toUpdate = zeroProfitParticipants.slice(0, 5);

    for (const p of toUpdate) {
        const ch = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        const name = profile?.full_name || 'Unknown';

        // Generate random profit between $100 and $5000
        const profit = Math.floor(Math.random() * 4900) + 100;
        const newEquity = ch.initial_balance + profit;

        // Update Challenge
        console.log(`Updating ${name} (Login: ${ch.login}) - Adding Profit: $${profit}`);

        const { error: updateError } = await supabase
            .from('challenges')
            .update({
                current_equity: newEquity,
                current_balance: newEquity,
                metadata: { ...ch.metadata, manual_profit_injection: true }
            })
            .eq('id', ch.id);

        if (updateError) {
            console.error(`Failed to update ${name}:`, updateError);
        } else {
            console.log(`✅ Updated ${name}. New Equity: ${newEquity}`);
        }
    }
}

updateProfits();

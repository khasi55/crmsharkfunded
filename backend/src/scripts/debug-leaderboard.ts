
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSpecificUser() {
    const login = process.argv[2] ? parseInt(process.argv[2]) : 889224326;
    console.log(`Checking User ${login}...`);

    const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (!challenge) { console.log("Account not found"); return; }
    console.log(`Challenge ID: ${challenge.id} | User ID: ${challenge.user_id}`);

    // Check participation
    const { data: participation } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('user_id', challenge.user_id);

    if (!participation || participation.length === 0) {
        console.log("❌ User is NOT in any competition.");
    } else {
        console.log(`✅ User is in ${participation.length} competitions.`);
        participation.forEach(p => console.log(`   - Comp ID: ${p.competition_id} | Rank: ${p.rank} | Score: ${p.score}`));
    }

    // Check Trades for this challenge
    const { data: trades } = await supabase
        .from('trades')
        .select('profit_loss')
        .eq('challenge_id', challenge.id);

    const totalPnL = trades?.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0) || 0;
    console.log(`💰 Total PnL for Challenge ${challenge.login}: ${totalPnL}`);
}

checkSpecificUser();

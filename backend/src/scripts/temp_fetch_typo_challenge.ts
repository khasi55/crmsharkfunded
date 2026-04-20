
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkOldChallenge() {
    const oldId = 'bb0c3755-5dd6-4086-86fd-53fbb50164af'; // sharmarakhisharm895@gmail.com (Yesterday)
    const { data: challenges } = await supabase.from('challenges').select('*').eq('user_id', oldId);
    console.log('Challenges for typo account (Yesterday):', JSON.stringify(challenges, null, 2));
}

checkOldChallenge();

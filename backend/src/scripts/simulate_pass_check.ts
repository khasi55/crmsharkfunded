import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkPass(login: number) {
    console.log(`Checking account: ${login}`);
    const { data: challenge } = await supabase.from('challenges').select('*').eq('login', login).single();
    if (!challenge) return console.log('Not found');
    
    console.log(`Original Status: ${challenge.status}`);
    console.log(`Balance: ${challenge.current_balance}, Equity: ${challenge.current_equity}, Initial: ${challenge.initial_balance}`);
    console.log(`Group: ${challenge.group}, Type: ${challenge.challenge_type}`);

    const { data: rules } = await supabase.from('challenge_type_rules').select('*').eq('challenge_type', challenge.challenge_type).single();
    
    if (rules && rules.profit_target_percent > 0) {
        const targetEquity = Number(challenge.initial_balance) * (1 + (rules.profit_target_percent / 100));
        console.log(`Profit Target Needed: ${rules.profit_target_percent}% -> $${targetEquity}`);
        
        if (Number(challenge.current_equity) >= targetEquity) {
            console.log(`✅ PROFIT TARGET MET! (Equity ${challenge.current_equity} >= Target ${targetEquity})`);
            
            // Uncomment to force it manually
            // await supabase.from('challenges').update({ status: 'passed' }).eq('login', login);
            // console.log("Updated status to 'passed'");
        } else {
            console.log(`❌ Target not met yet.`);
        }
    } else {
        console.log("No profit target found in rules.");
    }
}

checkPass(900909495399);

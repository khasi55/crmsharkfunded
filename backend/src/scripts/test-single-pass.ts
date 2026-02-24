import { supabase } from '../lib/supabase';
import { RulesService } from '../services/rules-service';

async function checkPass(login: number) {
    const { data: challenge } = await supabase.from('challenges').select('*').eq('login', login).single();
    if (!challenge) return console.log('Not found');

    console.log(`Checking: ${login}`);
    console.log(`Status: ${challenge.status}`);
    console.log(`Initial: ${challenge.initial_balance}`);
    console.log(`Current Balance: ${challenge.current_balance}`);
    console.log(`Current Equity: ${challenge.current_equity}`);

    try {
        const rules = await RulesService.getRules(challenge.group, challenge.challenge_type);
        if (rules && rules.profit_target_percent > 0) {
            const targetEquity = Number(challenge.initial_balance) * (1 + (rules.profit_target_percent / 100));
            console.log(`Profit Target Needed: ${rules.profit_target_percent}% -> $${targetEquity}`);

            if (Number(challenge.current_equity) >= targetEquity) {
                console.log(`✅ PROFIT TARGET MET!`);
            } else {
                console.log(`❌ Target not met yet. Needs $${(targetEquity - Number(challenge.current_equity)).toFixed(2)} more.`);
            }
        } else {
            console.log("No profit target found in rules.");
        }
    } catch (err) {
        console.error("Rules error:", err);
    }
}

const loginId = parseInt(process.argv[2]);
if (loginId) {
    checkPass(loginId);
} else {
    console.log("Please provide a login id.");
}

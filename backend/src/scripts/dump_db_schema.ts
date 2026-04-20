
import { supabase } from '../lib/supabase';

async function run() {
    console.log("--- CHALLENGES SCHEMA ---");
    const { data: challenges, error } = await supabase.from('challenges').select('*').limit(1);
    if (error) {
        console.error("Error fetching challenges:", error);
    } else if (challenges && challenges.length > 0) {
        console.log("Challenge columns:", Object.keys(challenges[0]));
        console.log("Sample:", JSON.stringify(challenges[0], null, 2));
    } else {
        console.log("No challenges found.");
    }

    console.log("\n--- ACCOUNT TYPES SCHEMA ---");
    const { data: accountTypes, error: error2 } = await supabase.from('account_types').select('*').limit(1);
    if (error2) {
        console.error("Error fetching account_types:", error2);
    } else if (accountTypes && accountTypes.length > 0) {
        console.log("Account Type columns:", Object.keys(accountTypes[0]));
        console.log("Sample:", JSON.stringify(accountTypes[0], null, 2));
    } else {
        console.log("No account types found.");
    }

    console.log("\n--- CHALLEGE TYPE RULES SCHEMA ---");
    const { data: rules, error: error3 } = await supabase.from('challenge_type_rules').select('*').limit(1);
    if (error3) {
        console.error("Error fetching challenge_type_rules:", error3);
    } else if (rules && rules.length > 0) {
        console.log("Rule columns:", Object.keys(rules[0]));
        console.log("Sample:", JSON.stringify(rules[0], null, 2));
    } else {
        console.log("No rules found.");
    }
}

run();

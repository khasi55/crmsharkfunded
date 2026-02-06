
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const userId = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed'; // User from previous context

async function debugEligibility() {
    console.log(`Checking eligibility for user: ${userId}`);

    // 1. Fetch Accounts
    const { data: accountsRaw, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    console.log(`Found ${accountsRaw?.length} total accounts.`);

    // 2. Simulate Filter Logic
    const fundedAccounts = (accountsRaw || []).filter((acc: any) => {
        const status = (acc.status || '').toLowerCase();
        const type = (acc.challenge_type || '').toLowerCase();

        const statusMatch = status === 'active';
        const typeMatch = type.includes('instant') || type.includes('funded') || type.includes('master');

        console.log(`[Account ${acc.id.substring(0, 8)}] Type: '${acc.challenge_type}', Status: '${acc.status}' -> StatusMatch: ${statusMatch}, TypeMatch: ${typeMatch}`);

        if (!statusMatch) return false;
        return typeMatch;
    });

    console.log(`Eligible Accounts (Funded/Instant): ${fundedAccounts.length}`);

    // 3. Simulate Profit Calculation
    fundedAccounts.forEach((acc: any) => {
        const profit = Number(acc.current_balance) - Number(acc.initial_balance);
        console.log(`[Account ${acc.id.substring(0, 8)}] Balance: ${acc.current_balance}, Initial: ${acc.initial_balance} -> Profit: ${profit}`);
    });
}

debugEligibility();
